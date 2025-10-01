# Inspect Variable Extension

A VS Code/Cursor extension that enhances variable inspection during debugging with a clean, resizable popup window that displays variable data with automatic word wrapping.

## Features

- **Context Menu Integration**: Right-click any variable in the debug variables panel to access the "Inspect" command
- **Word-Wrapped Display**: Long values (like JSON strings) are displayed with word wrapping, eliminating horizontal scrolling
- **Resizable Window**: The inspection window opens in a separate panel that you can resize to your preference
- **Copy to Clipboard**: Quickly copy variable contents to your clipboard
- **Smart Formatting**: Automatically formats JSON values for better readability

## Usage

1. Start a debugging session in VS Code/Cursor
2. When execution pauses at a breakpoint, navigate to the Debug Variables panel
3. Right-click on any variable you want to inspect
4. Select "Inspect" from the context menu
5. A new panel will open displaying the variable's details with word wrapping enabled

## Installation

### From Source

1. Clone this repository
2. Run `npm install` to install dependencies
3. Run `npm run compile` to build the extension
4. Press F5 to open a new window with the extension loaded

### From VSIX

1. Run `npm run package` to create a `.vsix` file
2. In VS Code/Cursor, go to Extensions
3. Click the "..." menu and select "Install from VSIX..."
4. Select the generated `.vsix` file

## Development

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- VS Code or Cursor

### Building

```bash
npm install
npm run build
```

### Watching for Changes

```bash
npm run watch
```

### Packaging

```bash
npm run package
```

## Requirements

- VS Code version 1.80.0 or higher
- Active debugging session

## Extension Settings

This extension does not add any VS Code settings.

## Known Issues

None at the moment. Please report any issues on the GitHub repository.

## Release Notes

### 0.1.0

Initial release of Inspect Variable extension:
- Right-click context menu in debug variables panel
- Word-wrapped variable display
- Copy to clipboard functionality
- Automatic JSON formatting

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

