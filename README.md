# ACH

Automated Cozy Hydrater (ACH *[ax]*) is a CLI that lets you **create and remove documents in your Cozy**.

+ [Install](#install)
+ [Usage](#usage)
+ [Import data](#import-data)
+ [Import repositories with files](#import-repositories-with-files)
+ [Create photo albums with ACH](#create-photo-albums-with-ach)
+ [Export data keeping the ids](#export-data-keeping-the-ids)
+ [How to export all data from a konnector](#how-to-export-all-data-from-a-konnector)

<small><i><a href='http://ecotrust-canada.github.io/markdown-toc/'>Table of contents generated with markdown-toc</a></i></small>

## Install

Install ACH using yarn.

```
$ yarn global add git@github.com:cozy/ACH.git
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

## Create photo albums with ACH

You can create photo albums from a folder on your disk.

```
$ python scripts/albums-from-dir.py my-photos-directory resulting-albums.json
```

## Export data keeping the ids

By default, `_id` and `_rev` are stripped from the exported data. Sometimes, you want to keep the ids/rev of the documents you export. Set the
environment variable `ACH_KEEP_ID` to do so :

```bash
env ACH_KEEP_ID=true ACH export io.cozy.bills --url https://isabelledurand.cozy.rocks /tmp/bills.json
```

`ACH_KEEP_REV` does the same to keep the `_rev` field.

## How to export all data from a konnector

Say you have imported data from a konnector and you want to move this data to recette.

```bash
$ # First lets get all the doctypes from the konnector
$ PERMISSIONS=$(cat manifest.konnectors | jq -r '.permissions | .[] | .type' | python -c 'import sys; print ",".join(sys.stdin.read().split("\n"))[:-1]')
$ echo $PERMISSIONS
io.cozy.bills,io.cozy.files,org.fing.mesinfos.client,org.fing.mesinfos.contract,org.fing.mesinfos.paymentterms,org.fing.mesinfos.home,org.fing.mesinfos.consumptionstatement,org.fing.mesinfos.energybreakdown
$ # Export all data
$ node --inspect index.js export -t $PERMISSIONS data.json
```

