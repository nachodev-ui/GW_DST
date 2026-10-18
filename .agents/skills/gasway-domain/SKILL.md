---
name: gasway-domain
description: Apply Chilean LPG delivery rules when changing Gasway orders, catalogue, roles, dispatch, payments, or domain documentation.
---

# Gasway domain

- One app serves customer and driver roles. Driver access requires trusted provisioning and verification; never trust user-editable metadata. Admin web is future scope.
- A request is one GLP cylinder: 5, 11, 15 or 45 kg; Lipigas, Gasco or Abastible. Record exchange_empty explicitly; no exchange is a valid purchase. Availability and price are distributor-specific, not invented constants.
- Use requested → offered → accepted → on_the_way → delivered. Nonterminal states may move to cancelled. Terminal states never reopen. Offer refusal/expiry does not mean the whole order is cancelled; dispatch retries remain offered.
- A verified available driver must have an unexpired targeted offer. Accept through accept_order(p_order_id); never split assignment into client read/write. The first atomic claim wins. A driver has at most one active delivery.
- For the MVP use cash_on_delivery only. Keep Mercado Pago/Webpay behind the payment contract; no gateway implementation yet. Prices are nonnegative integer CLP and server-authoritative.
- Store canonical RUT without dots, uppercase K and a hyphen; validate modulo-11 at trusted boundaries. Use official five-digit commune CUT codes, not ambiguous names. UI is es-CL and CLP has no fractional pesos.
- No expired state LPG coupon, subsidy or coupon eligibility flow.
- Precise delivery addresses and locations are private. Only participants read orders; customers see driver location only during accepted/on_the_way. Offer recipients receive minimum necessary data from a future trusted backend.
- Keep RLS enabled and validate external input with zod. Read docs/domain.md for the state table and docs/architecture.md for trust boundaries. Update README.md and relevant docs after material changes.
