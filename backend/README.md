# Backend

## Handle dependencies in `package.json` files

- Install/uninstall packages only via `npm install {package-name}` or `npm uninstall {package-name}`. Don't edit the dependencies in `package.json` files directly or this may lead to wrong dependencies in the corresponding `package-lock.json`.
- After (un)installing a dependency, make sure to also update the corresponding `package(-lock).json` in related folders, see the following sections.

### Dependencies of a Lambda function

- Update `backend/src/lambdas/{lambda}/package(-lock).json`
- Run `npm install` in `backend`

### Dependencies of a Lambda Layer

- Update `backend/src/{package-name}/package(-lock).json`
- Run `npm install --install-links {path-of-package-for-layer}` in `backend/src/lambda-layers/{layer}`
  - The argument `--install-links` ensures that transitive dependencies from `{package-for-layer}` are installed in the layer
- Run `npm install` in `backend`

## Add a new Lambda function

- Add a new folder with the corresponding code in `backend/src/lambdas/{lambda}`
- Add a dependency to the package in `backend/package.json` (manual edit possible)
- Update the corresponding `package-lock.json` files as described above

## Add a new Lambda Layer

A Lambda Layer consists of two folders/packages so that the dependencies can be resolved properly, when Lambda code runs locally or in AWS:

- A package defining the layer itself: `{layer}`
- A package containing the code for the layer: `{package-for-layer}`

To add a layer follow these steps:

- Add a new folder with the corresponding `package(lock).json` files in `backend/src/lambda-layers/{layer}`
- Add a new folder with the code for the layer in `backend/src/{package-for-layer}`
- Add a dependency to `{package-for-layer}` in `backend/src/lambda-layers/{layer}/package.json` (manual edit possible)
- Add a dependency to `{package-for-layer}` in `backend/package.json` (manual edit possible)
- Update the corresponding `package-lock.json` files as described above
