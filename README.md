# Concourse NPM Resource

Publishes [NPM](https://npmjs.com) packages.

## Resource Configuration

```yaml
resource_types:

- name: npm
  type: docker-image
  source:
    repository: nolan/concourse-npm-resource
```

## Source Configuration

* `package`: The name of the npm package.  Used for `check` and `in`.
* `token`: *Required.* The NPM access token found in your .npmrc.
* `registry`: *Optional.* The registry to use.  Defaults to using the npm configured default.

Look for a line like the following:

```
//registry.npmjs.org/:_authToken=abcde
```

Then copy everything after the `=` to the `token` setting. You must have done `npm login` first.

### Example

```yaml
resources:
- name: package
  type: npm
  source:
    package: {{npm_package_name}}
    username: {{npm_token}}
    registry: {{npm_registry}}
```

## Behavior

### `check`: Checks for versions of a specific node package

Checks for versions of "source.package" at the given registry.

### `in`: Pulls a package from npm

Fetches a package from npm.

#### Parameters

* `topLevel`: *Optional.* Set to `true` to install the package at the top level of the destination.  Otherwise, the package will be installed into node_modules.

### `out`: Publish an NPM Package

Publishes a resource containing a `package.json` to NPM.

#### Parameters

* `path`: *Required.* Path to `package.json` to be published.

* `access`: *Optional.* One of either `public` or `restricted`. Determines the access level of the published package.

#### Examples

Publishes `package.json` at `mypackage`. manually trigger each when the upgrade has been independently verified.

```yaml
jobs:
- name: publish
  plan:
  - get: packageRepo
    trigger: true
  - put: npm
    params:
      path: mypackage
```
