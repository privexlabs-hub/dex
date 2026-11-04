# ADR-010 Payments: Paddle (merchant of record) + Paystack (NGN), Bachs as a later adapter

**Context.** Lagos-registered company selling globally. Verified: Bachs is a PSP, not MoR ("You are the seller of record"), 5% + 40¢ international cards, USD-card-only subscriptions, licensed partners undisclosed. Paddle is MoR (handles VAT incl. Nigeria 7.5%), 5% + 50¢, Nigeria not on its unsupported-seller list, product approval required. Paystack: local 1.5% + ₦100 capped ₦2,000; international 3.9%.

**Decision.** One provider-agnostic billing domain (`PaymentProvider` adapter: checkout, portal, subscription, cancel, change plan, refund, verifyWebhook, normalizeEvent) with Paddle for international subscriptions and Paystack for naira. Bachs joins once partner disclosure, sandbox-verified payouts/refunds/disputes and status history are in hand. USD list prices with quarterly-reviewed NGN points and prepaid passes.

**Consequences.** Two reconciliations; webhooks are the only source of truth; idempotency table keyed (provider, event id); out-of-order events skipped by `created_at`. Apply to Paddle in Phase 1/2 because approval gates Phase 6.

**Sources.** bachs.io/merchant-terms, bachs.io/pricing, docs.bachs.io; paddle.com pricing and supported-countries; paystack.com/pricing.
