There are two places to manually publish

but first, the prep

1. at the root of the monorepo run `pnpm install` then `pnpm build`
2. in this directory (packages/vscode)
    1. bump the version in package.json (packages/vscode/package.json)
    1. run `pnpm build`
    1. run `pnpm bundle`
    1. run `pnpm pack` - this creates the `*.vsix` file that we publish

## VS Code Marketplace

Published package is visible here: https://marketplace.visualstudio.com/items?itemName=typed-ember.glint2-vscode

in this directory (packages/vscode)

1. Visit this secret ["Manage Publishers & Extensions" page](https://marketplace.visualstudio.com/manage/publishers/typed-ember)
    1. Find the `...` next to the package name and click it
        1. Click Update
    1. Drop the created `*.vsix` file onto the modal 
    1. The modal will close and a "Verifying" text and icon will display next to the version (barely visible - you'll see a `▶ V...`) and can only see that it says "Verifying <next version>" by inspecting the DOM with the dev tools
    1. Refreshing the page will replace the version with `▶ Verifying...`
    1. Wait
    
Done


## Open VSIX

Published package is visible here: https://open-vsx.org/extension/typed-ember/glint2-vscode

1. Login
1. Visit https://open-vsx.org/user-settings/extensions
    1. Click "Publish Extension"
    2. Drop the created `*.vsix` file onto the modal
    3. click "Publish"

Done.
