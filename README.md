# ACH

Automated Cozy Hydrater (ACH *[ax]*) is a CLI that lets you **create and remove documents in your Cozy**.

  * [Install](#install)
  * [Usage](#usage)
  * [Import data](#import-data)
  * [Import repositories with files](#import-repositories-with-files)
  * [Using ACH with Cozy whose password we do not have](#using-ach-with-cozy-whose-password-we-do-not-have)

## Install

Install ACH using yarn.

```
$ yarn global add git+ssh://git@gitlab.cozycloud.cc/labs/ACH.git
```


If you cannot execute `ACH` after this command, it may be because you do not have
the directory where `yarn` stores its symbolic links in your `PATH`. Edit it to append
the result of `yarn global bin`.

## Usage

```
$ ACH --help

  Usage: ACH [options] [command]


  Options:

    -V, --version       output the version number
    -t --token [token]  Token file to use (defaults to token.json)
    -y --yes            Does not ask for confirmation on sensitive operations
    -u --url [url]      URL of the cozy to use. Defaults to "http://cozy.tools:8080".'
    -h, --help          output usage information


  Commands:

    import [options] [filepath] [handlebarsOptionsFile]  The file containing the JSON data to import. Defaults to "example-data.json". Then the dummy helpers JS file (optional).
    importDir [directoryPath]                            The path to the directory content to import. Defaults to "./DirectoriesToInject".
    drop <doctypes...>                                   Deletes all documents of the provided doctypes. For real.
    export [doctypes] [filename]                         Exports data from the doctypes (separated by commas) to filename
```

## Import data

Files provided to the `import` command are parsed by [dummy-json](https://github.com/webroo/dummy-json), so you can pass a template file instead of a straight up JSON if you like.

Here is an example of data import:

```shell
$ ACH import data/edf/data.json
```

Some JSON files use handlebars helpers, for those file, you need to specifiy where it is.

```shell
$ ACH import data/bank/bankData.json data/bank/helpers/bankDummyHelpers.js
```

You can see an example of helpers [here](https://gitlab.cozycloud.cc/labs/ACH/blob/master/data/bank/helpers/bankDummyHelpers.js).

To import some data on recette :

```shell
$ ACH import data/bank/bankData.json data/bank/helpers/bankDummyHelpers.js --url https://recette.cozy.works
```

## Import repositories with files

You can also import a full repository content into a Cozy by using the command `importDir`:

```shell
$ ACH importDir myDirectoryPath # default will be ./DirectoriesToInject
```

All your target directory content will be imported to the root of Cozy Drive following the correct repositories tree.

## Using ACH with Cozy whose password we do not have

You can generate a token with `cozy-stack`.

```
$ ssh recette.int.cozycloud.cc "cozy-stack instances token-cli recette.cozy.works io.cozy.accounts"
eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9......_FPOvwNsN7TU15GXFrLsgIZETokkT6r_4GlAYu_CdepfoGfw
```

Format the result in a JSON

```
$ ssh recette.int.cozycloud.cc "cozy-stack instances token-cli recette.cozy.works io.cozy.accounts" | tr -d '\n' | xargs -0 printf '{"token": "%s"}' > token.json
```

You can then use ACH normally with this token

