# Keyline Type

Keyline Type is an offline desktop typing test app inspired by Monkeytype. It runs on Windows, macOS, and Linux through Electron, and it stores typing history locally on the user's machine.

## Features

- Timed typing tests: 15, 30, and 60 seconds
- Local result history with WPM, raw WPM, accuracy, characters, and date
- Privacy-friendly storage in Electron's per-user app data folder
- No account, server, or internet connection required after dependencies are installed
- Cross-platform packaging through Electron Builder

## Development

```bash
npm install
npm start
```

On Windows PowerShell, if the `npm` script shim is blocked by execution policy, use `npm.cmd` instead:

```bash
npm.cmd install
npm.cmd start
```

## Verification

```bash
npm test
npm run check
```

## Packaging

Build for the current platform:

```bash
npm run dist
```

Platform-specific targets:

```bash
npm run dist:win
npm run dist:mac
npm run dist:linux
```

Electron stores local history at the OS-specific `userData` path for `Keyline Type`. In development this is typically under the current user's application data directory.

## Notes

This app is offline-first. The only network step is installing development dependencies. Typing results are saved to a local JSON file through Electron's main process; they are not sent to any server.
