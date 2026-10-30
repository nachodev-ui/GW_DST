import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
import { z } from 'npm:zod@4.6.7';

const inputSchema = z
  .object({ owner_type: z.enum(['vehicle', 'driver']), owner_id: z.uuid() })
  .strict();
const cleanupSchema = z.object({
  completed: z.boolean(),
  files: z.array(z.object({ bucket: z.enum(['documents', 'vehicle-photos']), path: z.string() })),
});
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};
const reply = (status: number, message: string) =>
  new Response(JSON.stringify({ message }), { status, headers });
Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (request.method !== 'POST') return reply(405, 'Método no permitido.');
  if (Number(request.headers.get('content-length') ?? 0) > 2048)
    return reply(413, 'Solicitud demasiado grande.');
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) return reply(401, 'Inicia sesión nuevamente.');
  try {
    const body = await request.text();
    if (body.length > 2048) return reply(413, 'Solicitud demasiado grande.');
    const input = inputSchema.parse(JSON.parse(body));
    const url = Deno.env.get('SUPABASE_URL')!;
    const user = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false },
    });
    const { data: identity, error: authError } = await user.auth.getUser(authorization.slice(7));
    if (authError || !identity.user) return reply(401, 'Inicia sesión nuevamente.');
    // This RPC reauthorizes current membership/admin status, locks the owner, deletes
    // only when historical FK rules allow it, and persists an idempotent cleanup ticket.
    const { data, error } = await user.rpc('delete_document_owner', {
      p_owner_type: input.owner_type,
      p_owner_id: input.owner_id,
    });
    if (error)
      return reply(
        error.code === '42501' ? 403 : 409,
        'No se puede eliminar este registro: revisa permisos, entregas e historial.',
      );
    const cleanup = cleanupSchema.parse(data);
    if (cleanup.completed) return reply(200, 'Registro y archivos eliminados.');
    const service = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false },
    });
    for (const bucket of ['documents', 'vehicle-photos'] as const) {
      const paths = cleanup.files.filter((file) => file.bucket === bucket).map((file) => file.path);
      for (let start = 0; start < paths.length; start += 100) {
        const removed = await service.storage.from(bucket).remove(paths.slice(start, start + 100));
        if (removed.error)
          return reply(
            503,
            'Registro eliminado; limpieza de archivos pendiente. Reintenta esta misma solicitud.',
          );
      }
    }
    const completed = await service.rpc('complete_document_cleanup', {
      p_owner_id: input.owner_id,
    });
    if (completed.error)
      return reply(
        503,
        'Archivos eliminados; confirmación pendiente. Reintenta esta misma solicitud.',
      );
    return reply(200, 'Registro y archivos eliminados.');
  } catch {
    return reply(400, 'No pudimos procesar la solicitud. Revisa los datos y vuelve a intentar.');
  }
});
