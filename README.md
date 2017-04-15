# ACH

Automated Cozy Hydrater (ACH *[ax]*) is a CLI that lets you create and remove documents in batches in your Cozy.

## Install

Install ACH by cloning the repo and running `npm i`.

Use it by running `node index.js` or `npm start` and let the help guide you!

## Import data

Files provided to the `import` command are parsed by [dummy-json](https://github.com/webroo/dummy-json), so you can pass a template file instead of a straight up JSON if you like.

Here is an example of data import:

```shell
npm start -t import example-data.json # -t is used to generate a new cozy-client token
```

You can also use your [dummy custom helpers](https://github.com/webroo/dummy-json#writing-your-own-helpers) by following:

```shell
npm start -t import example-data.json myDummyHelpers.js # the last optional argument is for dummy helpers
```

You can see an example of helpers [here](https://gitlab.cozycloud.cc/labs/ACH/blob/data/bankDummyHelpers.js).

## Import repositories with files

You can also import a full repository content to a Cozy using the command `importDir`:

```shell
npm start -t importDir myDirectoryPath # default will be ./DirectoriesToInject
```

All your target directory content will be imported to the root of Cozy Drive following the correct repositories tree.

## GitIgnored templates

If you want, you can store your own template collection in the `templates` directory, which is git-ignored.