# ACH

Automated Cozy Hydrater (ACH *[ax]*) is a CLI that lets you **create and remove documents in your Cozy**.

## Install

Install ACH by cloning the repository and install dependencies:

```
git clone https://gitlab.cozycloud.cc/labs/ACH.git
yarn
```

Use it by running `yarn start` and let the help guide you:

```
$ yarn start

  Usage: index [options] [command]


  Commands:

    import [dataFile] [helpersFile]  The file containing the JSON data to import. Defaults to "example-data.json". Then the dummy helpers JS file (optional).
    importDir [directoryPath]        The path to the directory content to import. Defaults to "./DirectoriesToInject".
    drop <doctypes...>               Deletes all documents of the provided doctypes. For real.
    export [docTypes] [filename]     Exports data from the doctypes (separated by commas) to filename

  Options:

    -h, --help                                                                        output usage information
    -V, --version                                                                     output the version number
    -t --token                                                                        Generate a new token.
    -u --url <url>', 'URL of the cozy to use. Defaults to "http://cozy.tools:8080".'
```

## Import data

Files provided to the `import` command are parsed by [dummy-json](https://github.com/webroo/dummy-json), so you can pass a template file instead of a straight up JSON if you like.

Here is an example of data import:

```shell
yarn start -- -t import example-data.json # -t is used to generate a new cozy-client token
```

You can also use your [dummy custom helpers](https://github.com/webroo/dummy-json#writing-your-own-helpers) by following:

```shell
yarn start -- -t import example-data.json myDummyHelpers.js # the last optional argument is for dummy helpers
```

You can see an example of helpers [here](https://gitlab.cozycloud.cc/labs/ACH/blob/master/data/bank/helpers/bankDummyHelpers.js).

## Import repositories with files

You can also import a full repository content into a Cozy by using the command `importDir`:

```shell
yarn start -- -t importDir myDirectoryPath # default will be ./DirectoriesToInject
```

All your target directory content will be imported to the root of Cozy Drive following the correct repositories tree.

## GitIgnored templates

If you want, you can store your own template collection in the `templates` directory, which is git-ignored.
