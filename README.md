# ACH

Automated Cozy Hydrater (ACH *[ax]*) is a CLI that lets you **create and remove documents in your Cozy**.

+ [Install](#install)
+ [Usage](#usage)
+ [Examples](#examples)
  + [Import data](#import-data)
  + [Import repositories with files](#import-repositories-with-files)
  + [Create photo albums with ACH](#create-photo-albums-with-ach)
  + [Export data keeping the ids](#export-data-keeping-the-ids)
  + [How to export all data from a konnector](#how-to-export-all-data-from-a-konnector)

## Install

Install ACH using yarn or npm.

```
$ yarn global add cozy-ach
$ npm install -g cozy-ach
```

If you cannot execute `ACH` after this command, it may be because you do not have
the directory where `yarn` stores its symbolic links in your `PATH`. Edit it to append
the result of `yarn global bin`.

## Usage

```
Usage: ACH [options] [command]

Options:
  -V, --version                               output the version number
  -t --token [token]                          Token file to use
  -y --yes                                    Does not ask for confirmation on sensitive operations
  -u --url [url]                              URL of the cozy to use. Defaults to "http://cozy.localhost:8080".' (default: "http://cozy.localhost:8080")
  -h, --help                                  output usage information

Commands:
  import <filepath> [handlebarsOptionsFile]   The file containing the JSON data to import. Defaults to "example-data.json". If the file doesn't exist in the application, ACH will try to find it inside its data folder. Then the dummy helpers JS file (optional).
  importDir <directoryPath>                   The path to the directory content to import. Defaults to "./DirectoriesToInject".
  generateFiles [path] [filesCount]           Generates a given number of small files.
  drop [options] <doctypes...>                Deletes all documents of the provided doctypes. For real.
  export <doctypes> [filename]                Exports data from the doctypes (separated by commas) to filename
  downloadFile <fileid>                       Download the file
  delete <doctype> <ids...>                   Delete document(s)
  updateSettings                              Update settings
  token <doctypes...>                         Generate token
  script [options] <scriptName>               Launch script
  ls-scripts                                  Lists all built-in scripts, useful for autocompletion
  batch [options] <scriptName> <domainsFile>  Launch script
```

## Examples

### Import data

```shell
$ cat data.json
{
  "io.cozy.bills": [
    {
      "_id": "eba16106554ca9e23012f83f9c7937c0",
      "amount": 0.71,
      "beneficiary": "Thyrion Lannister",
      "date": "1455-05-08T22:00:00.000Z",
      "filename": "20170508_528117465_R17125200206528395_malakoff_mederic.pdf",
      "fileurl": "https://extranet.braavos-bank.com/espaceClient/sante/tbs/tbsGenererPDF.do?remb=34",
      "groupAmount": 3.58,
      "idPrestation": "528117465_R17125200206528395_412877436",
      "idReimbursement": "528117465_R17125200206528395",
      "invoice": "io.cozy.files:ff5864e01f2d20c472f2b0f6531860b7",
      "isRefund": true,
      "isThirdPartyPayer": true,
      "originalAmount": 2.04,
      "originalDate": "2017-04-28T22:00:00.000Z",
      "socialSecurityRefund": 1.33,
      "subtype": "Liver transplant",
      "type": "health_costs",
      "vendor": "Iron Bank of Braavos"
    },
    {
      "_id": "eba16106554ca9e23012f83f9c793761",
      "amount": 50,
      "beneficiary": "Jamie LANNISTER",
      "date": "1455-05-17T22:00:00.000Z",
      "filename": "20170517_528117465_R17137202332136169_malakoff_mederic.pdf",
      "fileurl": "https://extranet.braavos-bank.com/espaceClient/sante/tbs/tbsGenererPDF.do?remb=33",
      "groupAmount": 175,
      "idPrestation": "528117465_R17137202332136169_415641280",
      "idReimbursement": "528117465_R17137202332136169",
      "invoice": "io.cozy.files:c9a4b2104b4a10de543bd574ac9ff9b1",
      "isRefund": true,
      "isThirdPartyPayer": true,
      "originalAmount": 108,
      "originalDate": "1455-05-09T22:00:00.000Z",
      "socialSecurityRefund": 7.22,
      "subtype": "Golden hand",
      "type": "health_costs",
      "vendor": "Iron Bank of Braavos"
    },
    {
      "_id": "eba16106554ca9e23012f83f9c7936fa",
      "amount": 7.5,
      "beneficiary": "Jamie LANNISTER",
      "date": "1455-05-21T22:00:00.000Z",
      "filename": "20170521_528117465_R171401014733001_malakoff_mederic.pdf",
      "fileurl": "https://extranet.braavos-bank.com/espaceClient/sante/tbs/tbsGenererPDF.do?remb=32",
      "groupAmount": 7.5,
      "idPrestation": "528117465_R171401014733001_416477228",
      "idReimbursement": "528117465_R171401014733001",
      "invoice": "io.cozy.files:c9a4b2104b4a10de543bd574ac9fed3a",
      "isRefund": true,
      "isThirdPartyPayer": false,
      "originalAmount": 25,
      "originalDate": "1455-05-15T22:00:00.000Z",
      "socialSecurityRefund": 17.5,
      "subtype": "Chiropractor",
      "type": "health_costs",
      "vendor": "Iron Bank of Braavos"
    },
    {
      "_id": "eba16106554ca9e23012f83f9c7936dd",
      "amount": 0.89,
      "beneficiary": "Jamie LANNISTER",
      "date": "2017-07-30T22:00:00.000Z",
      "filename": "20170730_528117465_R17209200405325685_malakoff_mederic.pdf",
      "fileurl": "https://extranet.braavos-bank.com/espaceClient/sante/tbs/tbsGenererPDF.do?remb=30",
      "groupAmount": 5.21,
      "idPrestation": "528117465_R17209200405325685_432873233",
      "idReimbursement": "528117465_R17209200405325685",
      "invoice": "io.cozy.files:ff5864e01f2d20c472f2b0f6531853ef",
      "isRefund": true,
      "isThirdPartyPayer": true,
      "originalAmount": 2.54,
      "originalDate": "2017-07-24T22:00:00.000Z",
      "socialSecurityRefund": 1.65,
      "subtype": "Chemist",
      "type": "health_costs",
      "vendor": "Iron Bank of Braavos"
    },
    {
      "_id": "eba16106554ca9e23012f83f9c79311a",
      "amount": 0.36,
      "beneficiary": "Jamie LANNISTER",
      "date": "2017-08-06T22:00:00.000Z",
      "filename": "20170806_528117465_R17216201307522910_malakoff_mederic.pdf",
      "fileurl": "https://extranet.braavos-bank.com/espaceClient/sante/tbs/tbsGenererPDF.do?remb=29",
      "groupAmount": 7.709999999999999,
      "idPrestation": "528117465_R17216201307522910_434482904",
      "idReimbursement": "528117465_R17216201307522910",
      "invoice": "io.cozy.files:ff5864e01f2d20c472f2b0f653185344",
      "isRefund": true,
      "isThirdPartyPayer": true,
      "originalAmount": 1.02,
      "originalDate": "2017-08-01T22:00:00.000Z",
      "socialSecurityRefund": 0.66,
      "subtype": "Sour ",
      "type": "health_costs",
      "vendor": "Iron Bank of Braavos"
    }
  ]
}

$ ACH import data.json
```

If the file doesn't exist in the application, ACH will try to find it inside its data folder.

#### handlebars

Some JSON files use handlebars helpers, for those file, you need to specify the file where the helpers are defined.

```shell
$ ACH import data/bank/bankData.json data/bank/helpers/bankDummyHelpers.js
```

You can see an example of helpers [here](https://gitlab.cozycloud.cc/labs/ACH/blob/master/data/bank/helpers/bankDummyHelpers.js).

#### --url param

You can import to a remote Cozy with the `--url` option :

```shell
$ ACH import data/bank/bankData.json data/bank/helpers/bankDummyHelpers.js --url https://recette.cozy.works
```

#### serial import

By default, ACH imports data in parallel, by batches of 25. It is possible to import serially :

```shell
$ env ACH_PARALLEL=false ACH import data.json
```

### Import directories with files

To import a directory into a Cozy, use the `importDir` command:

```shell
$ ACH importDir myDirectoryPath # default will be ./DirectoriesToInject
```

All your target directory content will be imported to the root of Cozy Drive following the correct repositories tree.

### Create photo albums with ACH

You can create photo albums from a folder on your disk.

```
$ python scripts/albums-from-dir.py my-photos-directory resulting-albums.json
```

### Export data keeping the ids

By default, `_id` and `_rev` are stripped from the exported data. Sometimes, you want to keep the ids/rev of the documents you export. Set the
environment variable `ACH_KEEP_ID` to do so :

```bash
env ACH_KEEP_ID=true ACH export io.cozy.bills --url https://isabelledurand.cozy.rocks ./bills.json
```

`ACH_KEEP_REV` does the same to keep the `_rev` field.


### Import data from a CSV

See the [example](./examples/data-from-csv/README.md).

