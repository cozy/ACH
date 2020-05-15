# Import data from CSV files

ACH does not support the import of CSV directly. 

1. You need to transform the data into the JSON format understood by ACH
2. You can use ACH to import your data

Here the example is from a banking data perspective. Say you banking
institutions has provided you data in CSV and you want to import it in your
Cozy to see the data in Banks.

* `accounts.csv`: contains data on your banking accounts
* `operations.csv`: contains data on your banking operations

You can look at the parser to see how we transform the CSV data contained
in `accounts.csv` and `operations.csv` into a format understandable by
ACH. THe parser is basic here, the main point of attention here is the
reference helper being used to link operations to accounts after accounts
have been inserted into the Cozy.

### Usage

```
node parser.js accounts.csv operations.csv > banking-data.json
ach import banking-data.json
```
