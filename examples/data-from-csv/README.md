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

⚠️ The parser is *very* barebone and is just intended as an example. Parsing
CSV is [much harder than what it seems][parsing-csv]. You'd be better of with
a real CSV parsing library.

[parsing-csv]: http://thomasburette.com/blog/2014/05/25/so-you-want-to-write-your-own-CSV-code/

### Usage

```
node parser.js accounts.csv operations.csv > banking-data.json
ach import banking-data.json
```
