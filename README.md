# ACH

Automated Cozy Hydrater (ACH *[ax]*) lets you create (and later maybe remove) documents in your Cozy.

Install ACH by cloning the repo and running `npm install`.

Use it by running `node index.js` or `npm start`. ACH supports 2 parameters:

- the URL of the Cozy, defaults to `http://cozy.tools:8080`
- the path to the file containing the documents to import, defaults to `example-data.json`

The file containing the documents must match the provided example's format.

The first time you run ACH, it will fetch and store an access token. This token is only valid for the docTypes that were listed in the data file. If you subsequently change the data file to import different types of document, you should delete the `token.json` file to force ACh to generate a new token.