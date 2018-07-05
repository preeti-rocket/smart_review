'use strict';
const shim = require('fabric-shim');
const util = require('util');

let Chaincode = class {

  // The Init method is called when the Smart Contract 'smart_review' is instantiated by the blockchain network
  // Best practice is to have any Ledger initialization in separate function -- see initLedger()
  async Init(stub) {
    console.info('=========== Instantiated smart_review chaincode ===========');
    return shim.success();
  }

  // The Invoke method is called as a result of an application request to run the Smart Contract
  // 'smart_review'. The calling application program has also specified the particular smart contract
  // function to be called, with arguments
  async Invoke(stub) {
    let ret = stub.getFunctionAndParameters();
    console.info(ret);

    let method = this[ret.fcn];
    if (!method) {
      console.error('no function of name:' + ret.fcn + ' found');
      throw new Error('Received unknown function ' + ret.fcn + ' invocation');
    }
    try {
      let payload = await method(stub, ret.params);
      return shim.success(payload);
    } catch (err) {
      console.log(err);
      return shim.error(err);
    }
  }

  async queryDocument(stub, args) {
    if (args.length != 1) {
      throw new Error('Incorrect number of arguments. Expecting Document ID: Example Doc005');
    }
    let doc = args[0];
    let documentContent = await stub.getState(doc); //get the document from chaincode state
	
    if (!documentContent || documentContent.toString().length <= 0) {
      throw new Error('No Document exists with ID ' + doc);
    }
    console.log(documentContent.toString());
    return documentContent;
  }

  async initLedger(stub, args) {
    console.info('============= START : Initialize Ledger ===========');
    let documents = [];
    documents.push({
      documentID:  'doc001',
	  docContent: 'This is document summarizes what needs to be implemented in Sprint 1 for product XYZ',
	  owner: 'Gopalji'
    });
	documents.push({
      documentID:  'doc002',
	  docContent: 'This is document summarizes what needs to be implemented in Sprint 2 for product XYZ',
	  owner: 'Tejaswini'
    });
	documents.push({
      documentID:  'doc003',
	  docContent: 'This is document summarizes what needs to be implemented in Sprint 4 for product ABC',
	  owner: 'Alok'
    });

    for (let i = 0; i < documents.length; i++) {
      documents[i].docType = 'documents';
      await stub.putState('reviewDoc' + i, Buffer.from(JSON.stringify(documents[i])));
      console.info('Added <--> ', documents[i]);
    }
    console.info('============= END : Initialize Ledger ===========');
  }

  async queryAllDocuments(stub, args) {

    let startKey = 'reviewDoc0';
    let endKey = 'reviewDoc10';

    let iterator = await stub.getStateByRange(startKey, endKey);

    let allResults = [];
    while (true) {
      let res = await iterator.next();

      if (res.value && res.value.value.toString()) {
        let jsonRes = {};
        console.log(res.value.value.toString('utf8'));

        jsonRes.Key = res.value.key;
        try {
          jsonRes.Record = JSON.parse(res.value.value.toString('utf8'));
        } catch (err) {
          console.log(err);
          jsonRes.Record = res.value.value.toString('utf8');
        }
        allResults.push(jsonRes);
      }
      if (res.done) {
        console.log('end of data');
        await iterator.close();
        console.info(allResults);
        return Buffer.from(JSON.stringify(allResults));
      }
    }
  } 

  async changeDocumentOwner(stub, args) {
    console.info('============= START : changeDocumentOwner ===========');
    if (args.length != 2) {
      throw new Error('Incorrect number of arguments. Expecting 2');
    }

	let doc = args[0];
    let documentContent = await stub.getState(doc);
    let currentDocument = JSON.parse(documentContent);
	currentDocument.owner = args[1];
	
    await stub.putState(args[0], Buffer.from(JSON.stringify(currentDocument)));
    console.info('============= END : changeDocumentOwner ===========');
  }
  
  async changeDocumentContent(stub, args) {
    console.info('============= START : changeDocumentContent ===========');
    if (args.length != 2) {
      throw new Error('Incorrect number of arguments. Expecting 2');
    }

	let doc = args[0];
    let documentContent = await stub.getState(doc);
    let currentDocument = JSON.parse(documentContent);
	currentDocument.docContent = args[1];
	
    await stub.putState(args[0], Buffer.from(JSON.stringify(currentDocument)));
    console.info('============= END : changeDocumentContent ===========');
  }

  async getHistoryForDocuments(stub, args, thisClass) {

    let reviewDoc = "reviewDoc";
    let isHistory = true;
    //Modify the number of documents based on your need
    let numberOfDocuments = 10;
    let allResults = [];
    for (var i = 0;i<numberOfDocuments;i++) {
      let iterator = await stub.getHistoryForKey(reviewDoc + "" + i);
      while (true) {
        let res = await iterator.next();
        console.log('Trying to get History');
        if (res.value && res.value.value.toString()) {
          let jsonRes = {};
          console.log('************************');
          console.log(res.value.value.toString('utf8'));

          if (isHistory && isHistory === true) {
            jsonRes.TxId = res.value.tx_id;
            jsonRes.Timestamp = res.value.timestamp;
            jsonRes.IsDelete = res.value.is_delete.toString();
            try {
              jsonRes.Value = JSON.parse(res.value.value.toString('utf8'));
            } catch (err) {
              console.log(err);
              jsonRes.Value = res.value.value.toString('utf8');
            }
          } else {
            jsonRes.Key = res.value.key;
            try {
              jsonRes.Record = JSON.parse(res.value.value.toString('utf8'));
            } catch (err) {
              console.log(err);
              jsonRes.Record = res.value.value.toString('utf8');
            }
          }
          allResults.push(jsonRes);
        }
        if (res.done) {
          console.log('end of data------------');
          await iterator.close();
          console.log(allResults);
          break;
        }
      }
    }
    
    return Buffer.from(JSON.stringify(allResults));
  }
}

shim.start(new Chaincode());
