# How to export all data from a konnector

Say you have imported data from a konnector and you want to move this data to recette.

```bash
$ # First lets get all the doctypes from the konnector
$ PERMISSIONS=$(cat manifest.konnectors | jq -r '.permissions | .[] | .type' | python -c 'import sys; print ",".join(sys.stdin.read().split("\n"))[:-1]')
$ echo $PERMISSIONS
io.cozy.bills,io.cozy.files,org.fing.mesinfos.client,org.fing.mesinfos.contract,org.fing.mesinfos.paymentterms,org.fing.mesinfos.home,org.fing.mesinfos.consumptionstatement,org.fing.mesinfos.energybreakdown
$ # Export all data
$ node --inspect index.js export -t $PERMISSIONS data.json
```