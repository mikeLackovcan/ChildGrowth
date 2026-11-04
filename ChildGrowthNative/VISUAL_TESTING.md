# Free visual testing

Questblox uses the free, open-source Maestro CLI for local UI journeys and screenshot regression checks. No paid cloud account is needed.

## Run the suite

```bash
npm run test:visual
```

The command exports the Expo web app, starts a local-only server, and tests these viewports:

- small phone: 360 × 640
- common Android phone: 412 × 915
- tablet: 768 × 1024

The flows cover role choice, child sign-in, parent sign-in and registration, the child quest home, and the add-quest screen. They check important visible controls and compare screenshots with the reviewed images in `.maestro/baselines` at a 97% similarity threshold.

Failure screenshots, screen hierarchies, logs, and JUnit reports are written to `.maestro/artifacts`. That folder is ignored by Git.

## Review a deliberate visual change

Run the suite, inspect the failure image and the new `takeScreenshot` image under `.maestro/artifacts`, and confirm the new layout at all three sizes. Replace the matching file in `.maestro/baselines/<size>` only after that review, then rerun `npm run test:visual`.

## Native Android check

The web suite catches responsive layout, missing controls, clipped text, and most navigation regressions. Android keyboard, notification permission, alarm, and push behavior still require the free Maestro CLI with a connected Android phone or local emulator. A physical phone is preferred on this machine because an emulator needs several gigabytes of disk space.
