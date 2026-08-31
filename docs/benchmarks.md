# Large-note benchmark

Linked Graph Navigator bounds rendered DOM at 12 to 120 direct routes according to measured panel area and at 48 next-step routes. The complete authored link set remains available in Outline view.

Run the parser benchmark with:

```bash
npm test -- tests/performance.test.ts
```

The 1.6.0 release gate parses a generated Markdown note with 5,000 unique resolved routes and requires completion within 1,500 ms. The 2026-08-31 local release run completed the parser body in 13.3 ms. This measured result is environment-specific; the threshold is the regression contract, not a device-wide performance guarantee.

For interactive verification, open `Benchmarks/Dense Routes.md` in the [public demo Vault](https://github.com/woonyong-kr/obsidian-navigator-demo-vault). It contains 130 distinct subpath routes, triggers the bounded graph notice, and exposes the complete list through the Outline fallback.
