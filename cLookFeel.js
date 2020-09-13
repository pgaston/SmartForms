//console.show();    // debugging w/ Acrobat... okay, if you use an expired Acrobat (otherwise Ctrl-J brings up console window)

/* Framework Contents:
- Global definitions - including phrasing that must be in code (and can be in a language - here EN and FR)
- Utilities, take one
- Document object referencing, short cuts
- Utilities (take 2), Initialization code, and some high-level utilities
- Validation helpers
- Business logic, e.g., on tab switch, more complicated logic
- Hide/Show background code - save/restore
- Tabs, Twisties code

To Reader Extend...
- Beginning with the original document,open in Acrobat Pro.  Save a copy which disables the usage rights for Reader.
- Open the new file in Acrobat Pro.  Enable the usage rights for Reader under the Advanced menu.  Save file. 
- Next,open the new file in Reader X…and voila!  I was able to fill-in the form and subsequently save this information!

ADOBE BUGS - some of many...
+ To remove Adobe bug when adding to a table
  - in ColorFieldsValidation comment out the line
    //		sSOM=sSOM.replace("xfa[0].form[0]","xfa[0].template[0]");
+ Do not have user editable items in the first row of a table - on save rows get temporarily inserted ahead.
+ remove white space,e.g.,space after comma (this one might be gone)
*/

/***************************************/
/***** Global Definitions *****/
/***************************************/

// Global variables - Control/Initialization
var bEN = form1.FirstPage.Header.cbEnglish.rawValue == 1; // Else French - Set from checkbox on header
var bInitializing = true; // while initializing - to turn off initial validation scripting
var bFirstInitializing = false; // First time only
var bAbsoluteFirstTime = true;
var bFirstTime; // First time through form
var bValidating = false;
var oToday; // normalized to start of day

// Arrays/Dictionaries
var vaFldTest = {}; // store initial test value for restoration later
var avEmailForms = {}; // email addresses with form: {'name':formname,'form':formobject}, to go there

// form logic
var bPreEmail = true; // true until the first email button is hit - every time form is opened!
var bUserState; // User in control - false is requestor,true is fulfiller

// E-mail addresses, for complex cases I tend to use a json table (built in Excel)
var aToCC = "maintcapture@acme.com";
var aToCorpECom = "corpecom@acme.com";
var aToEBBEnrol = "ebbenrol@acme.com;";
var aToError = "john.cho@acme.com";
var aToNA = aToError;

// Messages - both EN and FR
var msgSubject = bEN ? "CM Maintenance - " : "Maintenance GT - ";
var msgSubjectCCRequest = bEN ? "CC Maintenance/" : "CC Maintenance/";
var msgBody = bEN
  ? "The Cash Management Products Maintenance Form is attached.\n\nPlease include all information in the form.  Any additional comments in this email will not be seen."
  : "Le formulaire de maintenance des produits de gestion de tresorerie est attache.\n\nVeuillez inclure toutes les informations dans le formulaire. Tous les commentaires supplementaires dans cet e-mail ne seront pas lus.";

var msgApproved = bEN ? "**Approved** " : "**Approuvée** ";
var msgDeclined = bEN ? "**Declined** " : "** Refusée ** ";
var msgSubjectAppRequest = bEN
  ? "**Approval Required** "
  : "**Approbation exigée** ";
var msgBodyAppRequest = bEN
  ? "Please review this request in the attached PDF and either approve or decline at the bottom of that form and continue to follow instructions on the form."
  : "Veuillez examiner la demande dans le PDF ci-joint et approuver ou refuser au bas de ce formulaire et continuer de suivre les instructions qui sont sur formulaire.";

var msgNo = bEN ? "No" : "Non";
var msgYes = bEN ? "Yes" : "Oui";
var msgJanuary = bEN ? "January" : "Janvier";
var msgFebruary = bEN ? "February" : "Fevrier";
var msgMarch = bEN ? "March" : "Mars";
var msgApril = bEN ? "April" : "Avril";
var msgMay = bEN ? "May" : "Mai";
var msgJune = bEN ? "June" : "Juin";
var msgJuly = bEN ? "July" : "Juillet";
var msgAugust = bEN ? "August" : "Aout";
var msgSeptember = bEN ? "September" : "Septembre";
var msgOctober = bEN ? "October" : "Octobre";
var msgNovember = bEN ? "November" : "Novembre";
var msgDecember = bEN ? "December" : "Decembre";
var msgAndMore = bEN ? "(and more...)" : "(et de plus...)";
var msgAlertNoRemove = bEN
  ? "The last item can not be removed"
  : "Le dernier élément ne peut pas être supprimé.";
var msgAlertNoMoreThan = bEN
  ? "The maximum number of items is "
  : "Le nombre maximal d'éléments est ";
var msgRemoveRow = bEN ? "Remove row " : "Retirer la ligne "; // then a numbervar msgTabName=bEN?["Service Needs tab","Gather Information tab","Implement Servicing tab"]:["Aperçu onglet","Obtention des renseignements onglet","Implantation de l'inscription onglet"];
var msgSelected = bEN ? " selected" : " sélectionné";
var msgEMailsDone = bEN
  ? "All forms have now been emailed."
  : "Toutes les formes qui ont été envoyés par courriel.";
var msgSendEmail = bEN ? "Submit Form" : "Soumettre la formule";
var msgSendEmailS1 = bEN ? "Send " : "Envoyer "; // button text is -- msgSendEmailS1 + "2" + msgSendEmailS2 -- e.g.,Send 2 EMails
var msgSendEmailS2 = bEN ? " Emails" : " e-mails";
var msgMultiEmails = bEN
  ? "You will be asked to send multiple Emails.   Each goes to a specific recipient for them to fulfill.\n\n**There is a DELAY between Emails.   Don't leave the screen.**"
  : "Il vous sera demandé d'envoyer plusieurs emails. Chacun va à un destinataire spécifique pour eux à remplir.\n\n** Il y a un délai entre e-mails. Ne quittez pas l'écran. **";
var msgNoEmails = bEN
  ? "Please select a service - no actions have been selected."
  : "Veuillez sélectionner un service dans la zone de demande fréquent";

/**********************************************/
/***** Utilities-take one *****/
/**********************************************/

function assert(condition, message) {
  if (!condition) {
    message = "Assertion failed: " + message || "Assertion failed";
    if (typeof Error !== "undefined") {
      throw new Error(message);
    }
    throw message; // Fallback
  }
}

function fEnsure2Digits(number) {
  return number < 10 ? "0" + number.toString() : number.toString();
}

function fLog(aStr) {
  var oDate = new Date();
  var m = oDate.getMinutes();
  var s = oDate.getSeconds();
  var n = oDate.getMilliseconds();
  console.println(
    fEnsure2Digits(m) + ":" + fEnsure2Digits(s) + ":" + n + "  " + aStr
  );
}

// Utility to aid in matching document object position to actual object in document
var bOnlyOnce = true; // only want to show first alert
function fGetField(aField, aSection) {
  // Helper function to get DOM object
  var oField = resolveNode(aSection + aField);
  if (oField === null || typeof oField === "undefined") {
    if (bOnlyOnce) {
      console.println("fGetField failed on " + aSection + aField);
      app.alert("Yowza - fGetField failed on " + aSection + aField);
      bOnlyOnce = false;
    }
  }
  return oField;
}


/***************************************************/
/***** Document object referencing, short cuts *****/
/***************************************************/
// Technically, you can reference from the Javascript code, these are useful however to organize/centralize referencing from code

var aT1Header = "form1.FirstPage.Header.";
var aTabStrip = "form1.FirstPage.aTabStrip.";
var oSilentStore = fGetField("tfSilentStore", aT1Header); // where the field information is stored in JSON format
var oTabStrip = fGetField("aTabStrip", "form1.FirstPage.");
var oFirstTime = fGetField("cbFirstTime", aT1Header);
var oUserState = fGetField("cbUserState", aT1Header);
var oTabTab1 = fGetField("aTab[0]", aTabStrip);
var oTabTab2 = fGetField("aTab[1]", aTabStrip);

var aTab1 =
  "form1.FirstPage.aTabStrip.ShowArea.aShow[0].ShowSection.TabOneContent.";
var aTab2 =
  "form1.FirstPage.aTabStrip.ShowArea.aShow[1].ShowSection.TabTwoContent.";
var aTab2Forms = aTab2 + "sfForms.";

// Tab one
var oTab1Fields = fGetField("geOverview", aTab1);
var oTab1Selection = fGetField("geCB", aTab1);
var geDate = fGetField("geOverview.globalFormDate", aTab1);
var geClientName = fGetField("geOverview.globalClientName", aTab1);
var geClientSRF = fGetField("geOverview.globalClientSRF", aTab1);
var geClientType = fGetField("geOverview.globalClientType", aTab1);
var tfLoad = fGetField("sfLoad.tfLoad", aTab1);

// Tab two (and three)
var oTab2Forms = fGetField("sfForms", aTab2);
var oTab2NoneSelected = fGetField("Sect_None", aTab2Forms);
var oTab2OnToNext = fGetField("Sect_Next", aTab2Forms);
var oTab2Requestor = fGetField("ReqInstructions", aTab2);
var oTab2Processing = fGetField("ProcInstructions", aTab2);
var oTab2ProcessingForms = fGetField(
  "ProcInstructions.goInstr.txtForms",
  aTab2
);
var oTab2Overview = fGetField("Sect_OverviewInfo", aTab2Forms);
var oTab2RBCx = fGetField("Sect_RBCx", aTab2Forms);
var oTab3RBCx = fGetField("Sect_OverviewInfo.sfFromTab1.sfRBCx", aTab2Forms);

var oCommSectAddress = fGetField("Sect_ChangeAddress", aTab2Forms);
var oCommmSectContact = fGetField("Sect_Contact", aTab2Forms);
var oCommmSectCancel = fGetField("Sect_RemoveServ", aTab2Forms);
var oCommAddressServices = fGetField(
  "Sect_ChangeAddress.Content.sfalloptions.sfServices",
  aTab2Forms
);
var oCommContactServices = fGetField(
  "Sect_Contact.sfalloptions.sfServices",
  aTab2Forms
);
var oCommCancelServices = fGetField(
  "Sect_RemoveServ.Content.sfServices",
  aTab2Forms
);
var oCommAddressServicesRBCx = fGetField(
  "Sect_ChangeAddress.Content.sfalloptions.sfServices.cb[0]",
  aTab2Forms
);
var oCommContactServicesRBCx = fGetField(
  "Sect_Contact.sfalloptions.sfServices.cb[0]",
  aTab2Forms
);
var oCommCancelServicesRBCx = fGetField(
  "Sect_RemoveServ.Content.sfServices.cb[0]",
  aTab2Forms
);
var oCommCancelServicesRBCxSf = fGetField(
  "Sect_RemoveServ.Content.sfServices.sf",
  aTab2Forms
); // The Services section
var oCancelServicesTxtHeader = fGetField(
  "Sect_RemoveServ.Content.sfServices.txtServices",
  aTab2Forms
);

var oAddAcctsTbl = fGetField(
  "Sect_AcctOwned.Content.sfAccountsTable.tblAccounts",
  aTab2Forms
);
var oAddMLEAcctsTbl = fGetField(
  "Sect_AcctNonOwned.Content.sfAccountsTable.tblAccounts",
  aTab2Forms
);
var oAddNonSRFAcctsTbl = fGetField(
  "Sect_AcctNonSRF.Content.sfAccountsTable.tblAccounts",
  aTab2Forms
);
var oACHAcctsTbl = fGetField(
  "Sect_ACHAccts.Content.sfAccountsTable.tblAccounts",
  aTab2Forms
);
var oContactACHAcctsTbl = fGetField(
  "Sect_Contact.Content.sfContact[4].sfACH.sfAccountsTable.tblAccounts",
  aTab2Forms
);
var oContactNetworkGatewayTbl = fGetField(
  "Sect_Contact.Content.sfContact[16].sfACH.sfAccountsTable.tblAccounts",
  aTab2Forms
);
var oAdminTbl = fGetField(
  "Sect_Admin.Content.sfAccountsTable.tblAccounts",
  aTab2Forms
);
var oNonOwnedConfirm = fGetField("Sect_AcctNonOwned.Confirm", aTab2Forms);
var aTab2OwnedAccountsTable =
  aTab2 + "sfForms.Sect_AcctOwned.Content.sfAccountsTable.tblAccounts.Row[*]";
var aTab2NonOwnedAccountsTable =
  aTab2 +
  "sfForms.Sect_AcctNonOwned.Content.sfAccountsTable.tblAccounts.Row[*]";

var oACHDepositType = fGetField("Sect_ACHDirect.sf.rbYN", aTab2Forms);
var oACHDepositICanApprove = fGetField(
  "Sect_ACHDirect.Content.sfCommon.sfApproval.rb12",
  aTab2Forms
);
var oACHDepositMeApprove = fGetField(
  "Sect_ACHDirect.Content.sfCommon.sfGetApproval.sfForApprover.sfApprovedBy.rb12",
  aTab2Forms
);
var oACHDepositApproverEmail = fGetField(
  "Sect_ACHDirect.Content.sfCommon.sfGetApproval.sfGetApprover.approverEmail",
  aTab2Forms
);
var oACHDepositApproverSection = fGetField(
  "Sect_ACHDirect.Content.sfCommon.sfGetApproval.sfForApprover",
  aTab2Forms
);

var oCC = fGetField("Sect_CorpCreditor.Content", aTab2Forms);
var oCCCheckList = fGetField(
  "Sect_CorpCreditor.Content.sfModifyProfile.sfFirst.sfChecklist",
  aTab2Forms
);
var oCCFirst = fGetField(
  "Sect_CorpCreditor.Content.sfModifyProfile.sfFirst",
  aTab2Forms
);

// Debug
var oRBCStatementsCB = fGetField(
  "Sect_AcctNonSRF.Content.sfAccountsTable.tblAccounts.Row[0].Account.two.Services.sfDelAllServices.sfSvc[7].rbD",
  aTab2Forms
);

var oEDIPaymentReceiver = fGetField(
  "Sect_EDIPaymentReceiver.Content",
  aTab2Forms
);
var oEDIPaymentOriginator = fGetField(
  "Sect_EDIPaymentOriginator.Content",
  aTab2Forms
);
var oCEPAS = fGetField("Sect_CEPAS.Content", aTab2Forms);

var oTokensOrder = fGetField("Sect_Tokens.Content.sfcbOrder.cbBP", aTab2Forms);
var oTokensRemove = fGetField(
  "Sect_Tokens.Content.sfcbRemove.cbBP",
  aTab2Forms
);
var oTokensMove = fGetField("Sect_Tokens.Content.sfcbMove.cbBP", aTab2Forms);

// Tab three
var oTab3ReqInstructions = fGetField("ReqInstructions", aTab2);
var oTab3ProcInstructions = fGetField("ProcInstructions", aTab2);
var oTab3btnSubmit = fGetField(
  "ReqInstructions.goInstructions.btnEmail",
  aTab2
);
var oTabListForms = fGetField("ProcInstructions.goInstr.txtForms", aTab2);

/********************************************************/
/***** Utilities (take two), Initialization *************/
/********************************************************/

/*
    First time:
    1. fFirstInitialization - triggered by initialization on 'tfStoreSilent' - the first thing to be initialized
       - (if done) init big JSON 
       - read the fields ('required',etc.) to save validation state on
       - bInitializing=true (actually set in parse of this file)
    2. All the rest of the initializations in the forms get run
       And the validations
    3. fFinalInitialization - triggered by form:ready on 'tfStoreSilent'
        - for now,just report time it took

    see http://help.adobe.com/en_US/livecycle/9.0/designerHelp/index.htm?content=000752.html for help
*/

// These two utilities are for storing/retrieving a very large string from a set of text fields
// Bug(!) in Adobe where a textfield starts to fail when holding 50K characters and goes down miserably after that
// Fix is to limit the size a textfield can hold to ~10K.    So far works like a charm!
var kChunks = 32;
var kSize = 14000; // just in case it grows    (32*12K = 384, *15 = 480)
function splitOutBigString(a) {
  fLog("splitOutBigString - length: " + a.length);
  aSomBase = "form1.FirstPage.Header.sf.tfSt[";
  for (var i = 0; i < kChunks; ++i) {
    // clear out
    var aSOMtf = aSomBase + i + "]";
    var oTF = resolveNode(aSOMtf);
    oTF.rawValue = a.substr(i * kSize, kSize);
  }
}

function getSplitUpStr() {
  var a = "";
  aSomBase = "form1.FirstPage.Header.sf.tfSt[";
  for (var i = 0; i < kChunks; ++i) {
    var aSOMtf = aSomBase + i + "]";
    var oTF = resolveNode(aSOMtf);
    if (oTF.rawValue != null) {
      a += oTF.rawValue;
    }
  }
  return a;
}

// Used so that the date field gets set correctly on the next (user) open, not us opening...
function fResetToFirstTime(o) {
  geDate.rawValue = "";
  oFirstTime.rawValue = 1;
  o.presence = "hidden";
  app.alert(
    "Now save this form - next time the form is opened the date will default to that day"
  );
}

// first time initialization only!
function fHideTab2Forms() {

  fLog("fHideTab2Forms ignored");
  return;

  fDisplay(oTab2NoneSelected, false); // 'Please go back to tab one and select one or more services...
  fDisplay(oTab2OnToNext, false);
  fDisplay(oTab2Requestor, false);
  fDisplay(oTab2Overview, false);
  fDisplay(oTab2RBCx, false); // RBCx - asking for site information
  fDisplay(oTab3RBCx, false);

  // Check each section / row of services
  for (i = 0; i < vaServices.length; i++) {
    var aServiceArea = vaServices[i];
    var vRows = aServiceArea["rows"];
    for (j = 0; j < vRows.length; j++) {
      var aRow = vRows[j];
      fDisplay(aRow.form, false);
    }
  }
}

var liStartLoad; // timing of load
function fFirstInitialization() {
  console.println("\n");
  fLog("**Initialization");
  liStartLoad = new Date().getTime(); // milliseconds
  fLog("Language " + (bEN ? "EN" : "FR"));

  //fInitServiceDescription(); // init the definitional tables
  var oRightNow = new Date(); // and then normalize to start of day
  oToday = new Date(
    oRightNow.getFullYear(),
    oRightNow.getMonth(),
    oRightNow.getDate()
  );
  bFirstTime = fBool(oFirstTime); // first time form is run
  bUserState = fBool(oUserState); // what user is seeing this form - false is requestor,true is fulfillor
  oFirstTime.rawValue = 0; // next time is no longer first time

  if (bFirstTime) {
    geDate.rawValue = fFormatDate(oToday); // always now
  }

  bAbsoluteFirstTime = fFldStringEmpty(oSilentStore);

  if (bAbsoluteFirstTime) {
    fLog("First time ever");
    bFirstInitializing = true;

    // Read in values and save - this is so we can do form level initializations as desired
    fSaveFieldsStateRecursively(oTab1Fields); // remember protection on fields here - required,or not
    fSaveFieldsStateRecursively(oTab1Selection);
    fSaveFieldsStateRecursively(oTab2Forms);
    var a = stringify(vaFldTest);
    oSilentStore.rawValue = "set"; // in future,not 'absolute first time'
    splitOutBigString(a);
    fLog("Field State read - size: " + a.length);

    fHideTab2Forms(); // All sections are hidden and disabled - so we can do fQkDisplay from here on out
    fInitAllTabs(oTabStrip);
  } else {
    fLog("Subsequent open");
    var aJSState = getSplitUpStr();
    fLog("Read Field Store - size:" + aJSState.length);
    destringify(aJSState);
  }
}

function fFinalInitialization() {
  fInitJointOwnedTable();
  bInitializing = false;
  bFirstInitializing = false;

  var liEndLoad = new Date().getTime();
  var elapsed = liEndLoad - liStartLoad;
  elapsed /= 1000.0;
  tfLoad.rawValue = elapsed + " seconds";
  fLog("Final initialization - " + elapsed + " seconds");
}

function fPostSaveDoc() {
  // not used
  fLog("fPostSaveDoc");
}

function fPreSaveDoc() {
  // not used
  fLog("fPreSaveDoc");
}


/**********************************/
/***** Business Logic *************/
/**********************************/

function fShowAdmin(oAdminRow) {
  var oAction = oAdminRow.Action.takeAction;
  var oAdd = oAdminRow.Account.sf.sfAdd;
  var oExisting = oAdminRow.Account.sf.Existing;
  var oDelete = oAdminRow.Account.sf.txtDelSAName;
  var oModify = oAdminRow.Account.sf.Modify;
  var oBasic = oAdminRow.Account.sf.BasicInfo;
  var oAccess = oAdminRow.Account.sfAccess;

  assert(oAction != null, "fShowAdmin - oAction was null ");
  assert(oAdd != null, "fShowAdmin - oAdd was null ");
  assert(oExisting != null, "fShowAdmin - oExisting was null ");
  assert(oDelete != null, "fShowAdmin - oDelete was null ");
  assert(oModify != null, "fShowAdmin - oModify was null ");
  assert(oBasic != null, "fShowAdmin - oBasic was null ");
  assert(oAccess != null, "fShowAdmin - oAccess was null ");

  var iAction = oAction.rawValue; // add/delete/modify

  fDisplay(oAdd, iAction != 3); // add or delete
  fDisplay(oExisting, iAction != 1); // delete or modify
  fDisplay(oDelete, iAction == 2); // delete
  fDisplay(oModify, iAction == 3); // modify
  fQkDisplay(oBasic, iAction != 2); // add or modify
  fQkDisplay(oAccess, iAction != 2); // not delete
  fDisplay(oBasic.sfNo, oBasic.rbAll.rawValue == 2);
  fDisplay(oBasic.sfYes, oBasic.rbAll.rawValue == 1);
}

/************************/
/***** User Actions *****/
/************************/

function fClickKLinkGlossary() {
  if (bEN) {
    app.launchURL(
      "http://rbcbanking.fg.acme.com/productsservices/cid-264072.html",
      true
    );
    // was        app.launchURL("http://s3w03201.fg.acme.com/analytics/saw.dll?Dashboard&_scid=ZcEb0yjobco",true);
  } else {
    app.launchURL(
      "http://rbcbanking.fg.acme.com/productsservices-fr/cid-266476.html",
      true
    );
    // was        app.launchURL("http://s3w03201.fg.acme.com/analytics/saw.dll?Dashboard&_scid=ZcEb0yjobco",true);
  }
}

function fClickKLinkTransRisk() {
  if (bEN) {
    app.launchURL(
      "http://rbcbanking.fg.acme.com/productsservices/file-563113.pdf",
      true
    );
  } else {
    app.launchURL(
      "http://rbcbanking.fg.acme.com/productsservices-fr/file-563116.pdf",
      true
    );
  }
}

function fClickKLinkO21() {
  if (bEN) {
    app.launchURL(
      "http://ppl3-reader.fg.acme.com/GetDocument.aspx?Type=Folio&id=2&ds=1781&File=http%3a%2f%2fppl3-reader.fg.acme.com%2fcs000%2fO21RBCExpressExpressWirePayments%2fFolio%2fGS91_PF1781_Folio_English.doc",
      true
    );
  } else {
    app.launchURL(
      "http://ppl3-reader.fg.acme.com/GetDocument.aspx?Type=Folio&id=4&ds=1781&File=http%3a%2f%2fppl3-reader.fg.acme.com%2fcs000%2fO21RBCExpressExpressWirePayments%2fFolio%2fGS91_PF1781_Folio_French.doc",
      true
    );
  }
}

function fClickKLinkCRPG5() {
  if (bEN) {
    app.launchURL(
      "http://ppl3-reader.fg.acme.com/GetDocument.aspx?Type=Folio&id=5&ds=648&File=http%3a%2f%2fppl3-reader.fg.acme.com%2fcs000%2fCRPG5ProductGuidelinesCashManagement%2fFolio%2fGS91_PF648_Folio_English.doc",
      true
    );
  } else {
    app.launchURL(
      "http://ppl3-reader.fg.acme.com/GetDocument.aspx?Type=Folio&id=4&ds=648&File=http%3a%2f%2fppl3-reader.fg.acme.com%2fcs000%2fCRPG5ProductGuidelinesCashManagement%2fFolio%2fGS91_PF648_Folio_French.doc",
      true
    );
  }
}

function fClickKLinkNonSRF() {
  if (bEN) {
    app.launchURL(
      "http://rbcnet.fg.acme.com/cb/operations/bsc/cid-306187.html",
      true
    );
  } else {
    app.launchURL(
      "http://rbcnet.fg.acme.com/cashmanagement_fr/file-718750.pdf",
      true
    );
  }
}

function fClickKLinkClearingFolio() {
  if (bEN) {
    // Cash Management Product Enrolment Form Glossary
    app.launchURL(
      "http://rbcbanking.fg.acme.com/productsservices/cid-398201.html",
      true
    );
  } else {
    // Gestion de trésorerie Produit Formulaire d'inscription Glossaire
    app.launchURL(
      "http://rbcbanking.fg.acme.com/productsservices-fr/cid-398202.html",
      true
    );
  }
}

// *********
// not used
function fClickKLinkFeedback() {
  if (bEN) {
    app.launchURL(
      "http://rbcnet.fg.acme.com/cashmanagement/cid-83318.html",
      true
    );
  } else {
    app.launchURL(
      "http://rbcnet.fg.acme.com/cashmanagement_fr/cid-83608.html",
      true
    );
  }
}

function fClickKLinkO14() {
  if (bEN) {
    app.launchURL(
      "http://ppl3-reader.fg.acme.com/GetDocument.aspx?Type=Policy&id=1&ds=3600",
      true
    );
  } else {
    app.launchURL(
      "http://ppl3-reader.fg.acme.com/GetDocument.aspx?Type=Policy&id=2&ds=3600",
      true
    );
  }
}

function fACHCrossBorder() {
  if (bEN) {
    app.launchURL("http://rbcnet.fg.acme.com/ACH/file-828674.pdf", true);
  } else {
    app.launchURL(
      "http://rbcnet.fg.acme.com/transfrontieres-ACH/file-828676.pdf",
      true
    );
  }
}







  // Must repeat this as things may or may not have changed since fSetClientSegment ran
  if (bTab2) {
    fFormMakeReadWrite(oCommmSectContact);
  } else {
    fFormMakeReadOnly(oCommmSectContact);
  }
}

function fCancelInfoShows(bTab2) {
  //Show Reason Field in Cancel Servies Section when service checked
  var bAny = false;
  // Loop through all service checkboxes
  for (var i = 0; i < vaCommonSvcs.length; i++) {
    var oCB = oCommonCB(kaCommonCancelForm, i);
    if (fShowing(oCB)) {
      if (oCB.rawValue == 1)
        // active and checked - show all contacts for that section below
        bAny = true;
    }
  }
  fShowHideCancelSubSection(bAny);

  if (bTab2) {
    fFormMakeReadWrite(oCommmSectCancel);
  } else {
    fFormMakeReadOnly(oCommmSectCancel);
  }
}

function fGetClientType() {
  var iSegment = getRawElse(geClientType, 0) - 1;
  return iSegment;
}

// Next two wrap during the setting up of the form for emailing
function fHideAllCommonSubSections() {
  // loop through top level checkboxes - hide/show those that apply

  for (var i = 0; i < vaCommonSvcs.length; i++) {
    // Hide all the checkboxes
    var oCB = oCommonCB(kaCommonAddressForm, i);
    fHide(oCB);
    oCB = oCommonCB(kaCommonContactForm, i);
    fHide(oCB);
    oCB = oCommonCB(kaCommonCancelForm, i);
    fHide(oCB);
  }

  fHide(oCancelServicesTxtHeader); // The text 'Services' - show if any checkboxes set below

  // Now the subsections - hide'm all
  fShowHideAddressSubSection(false, false);
  fShowHideCancelSubSection(false);
  for (var i = 0; i < voContactShows.length; i++) {
    // Contact sub sections
    var oCS = voContactShows[i];
    fHide(oCS);
  }
}

// was fShowCommons
function fShowCommonSubSections(aEmail) {
  // for this email, only show what applies
  // loop through vaCommonActive - hide/show those that apply
  var iSegment = getRawElse(geClientType, 0) - 1;
  var bAny = false;
  for (var i = 0; i < vaCommonSvcs.length; i++) {
    var oSvc = vaCommonSvcs[i];
    var vRouting = oSvc.routing;
    var vCRouting = oSvc.contactRouting;

    var aRouteEMail = vRouting[iSegment];
    var aCRouteEMail = vCRouting[iSegment];

    if (aEmail == aRouteEMail) {
      // Address, Cancel at same time
      // only show if this CB is on...
      var oCB = oCommonCB(kaCommonAddressForm, i);
      if (fBool(oCB)) {
        fShow(oCB);
        fShow(oCommonCB(kaCommonAddressForm, i));
        fShowHideAddressSubSection(true, true);
      }

      var oCB = oCommonCB(kaCommonCancelForm, i);
      if (fBool(oCB)) {
        fShow(oCB);
        fShow(oCommonCB(kaCommonCancelForm, i));
        fShowHideCancelSubSection(true);
        fShow(oCancelServicesTxtHeader);
      }
    }

    if (aEmail == aCRouteEMail) {
      // Contact
      var oCB = oCommonCB(kaCommonContactForm, i);
      if (fBool(oCB)) {
        fShow(oCB);

        for (var j = 0; j < oSvc.active.length; j++) {
          // All Contact sub sections for this email
          var bShow = oSvc.active[j] == 1;
          if (bShow) {
            var oCS = voContactShows[j];
            fShow(oCS);
          }
        }
      }
    }
  }
}

function fShowAllCommons() {
  for (var i = 0; i < vaCommonSvcs.length; i++) {
    var oSvc = vaCommonSvcs[i];

    var oCB = oCommonCB(kaCommonAddressForm, i);
    fDisplay(oCB, oSvc.commonOn == 1);
    oCB = oCommonCB(kaCommonCancelForm, i);
    fDisplay(oCB, oSvc.commonOn == 1);
    oCB = oCommonCB(kaCommonContactForm, i);
    fDisplay(oCB, oSvc.contactOn == 1);
  }

  fAddressInfoShows(false);
  fContactInfoShows(false); // Get the contact areas to show
  fCancelInfoShows(false);
}



// SF Table helper functions
function fAddSfRow(oSfTable) {
  oSfRow = oSfTable.sfRow;
  oSfRow.instanceManager.addInstance(1);
  fixSfTable(oSfTable);

  var oBaseRow = oSfTable.nodes.item(1); // ignore instanceManager
  var oNewRow = oSfTable.nodes.item(oSfTable.nodes.length - 1); // last one added

  bFirstInitializing = true;
  oNewRow.execInitialize();
  bFirstInitializing = false;

  fMakeNewRowValidate(oBaseRow, oNewRow);
  splitOutBigString(stringify(vaFldTest)); // and save for next time
}

function fixSfTable(oSfTable) {
  // accessibility
  oSfRow = oSfTable.sfRow;
  aBaseSOM = oSfRow.somExpression;
  fShowAdmin.takeAction;
  var oAdd = oSfAdminRow.sf.sf.sfAdd;
  var oExisting = oSfAdminRow.sf.sf.Existing;
  var oDelete = oSfAdminRow.sf.sf.txtDelSAName;
  var oModify = oSfAdminRow.sf.sf.Modify;
  var oBasic = oSfAdminRow.sf.sf.BasicInfo;
  var oAccess = oSfAdminRow.sf.sf.sfAccess;

  assert(oAction != null, "fShowAdmin - oAction was null ");
  assert(oAdd != null, "fShowAdmin - oAdd was null ");
  assert(oExisting != null, "fShowAdmin - oExisting was null ");
  assert(oDelete != null, "fShowAdmin - oDelete was null ");
  assert(oModify != null, "fShowAdmin - oModify was null ");
  assert(oBasic != null, "fShowAdmin - oBasic was null ");
  assert(oAccess != null, "fShowAdmin - oAccess was null ");

  var iAction = oAction.rawValue; // add/delete/modify

  fDisplay(oAdd, iAction != 3); // add or delete
  fDisplay(oExisting, iAction != 1); // delete or modify
  fDisplay(oDelete, iAction == 2); // delete
  fDisplay(oModify, iAction == 3); // modify
  fQkDisplay(oBasic, iAction != 2); // add or modify
  fQkDisplay(oAccess, iAction != 2); // not delete
  fDisplay(oBasic.sfNo, oBasic.rbAll.rawValue == 2);
  fDisplay(oBasic.sfYes, oBasic.rbAll.rawValue == 1);
}

function fChangedCommonCancelRBCx(oServices) {
  var iServices = parseInt(oServices.rbSelServices.rawValue);
  var oAllServices = oServices.Services.sfRBCXServices;
  var oDelAllmsg = oServices.Services.sfServices.delAll;
  var oDelCoremsg = oServices.Services.sfServices.delCore;
  assert(oDelAllmsg != null, "fChangedCommonCancelRBCx - oDelAllmsg was null ");
  assert(
    oDelCoremsg != null,
    "fChangedCommonCancelRBCx - oDelCoremsg was null "
  );

  fHide(oDelAllmsg);
  fHide(oDelCoremsg);
  fHideServices(oAllServices);
  switch (iServices) {
    case 1: // all services
      fResetServices(oAllServices);
      fCheckAllServices(oAllServices, true);
      break;
    case 2: // core services - Balance Reporting, RBC Statements, Account Images, Stop Payments, Account Transfers, and Bill Payments
      fCheckAllServices(oAllServices, false);
      fResetAServiceSet(oAllServices, 0, true, true); // Balance Reporting
      fResetAServiceSet(oAllServices, 7, true, true); // Statements
      fResetAServiceSet(oAllServices, 9, true, true); // Account Imaging
      fResetAServiceSet(oAllServices, 3, true, true); // Stop Payments
      fResetAServiceSet(oAllServices, 1, true, true); // Account Transfers
      fResetAServiceSet(oAllServices, 2, true, true); // Bill Payments
      break;
    case 3: // select services
      fResetServices(oAllServices);
      fCheckAllServices(oAllServices, false);
      break;
    default:
    // okay, no default set...
  }
  fCancelACHService(oServices);
}

function getCancelServiceCB(oServices, i) {
  var aObj =
    oServices.Services.sfRBCXServices.somExpression + ".sfSvc[" + i + "]";
  var osfSvc = resolveNode(aObj);
  var oCB = osfSvc.cb;
  return oCB;
}

function fCancelACHService(oServices) {
  var iServices = parseInt(oServices.rbSelServices.rawValue);
  var oDelAllsF = oServices.Services.sfServices.sfDelGSANs;
  assert(oDelAllsF != null, "fCancelACHService - oDelAllsF was null ");
  fHide(oDelAllsF);

  var oCB1 = getCancelServiceCB(oServices, 10);
  var oCB2 = getCancelServiceCB(oServices, 11);
  assert(oCB1 != null, "fCancelACHService - oCB1 was null ");
  assert(oCB2 != null, "fCancelACHService - oCB2 was null ");

  var bSet = oCB1.rawValue == 1 || oCB2.rawValue == 1;
  fDisplay(oDelAllsF, bSet);

  oDelAllInterac = oServices.Services.sfServices.delInterac;
  oCBInterac = getCancelServiceCB(oServices, 12);
  fDisplay(oDelAllInterac, oCBInterac.rawValue == 1);
}

// Go to 'All Services'
function fChangedShowAccount(oAccountRow, bOwned, bMLE) {
  var oRBServices = oAccountRow.Account.two.Add;
  assert(oRBServices != null, "fChangedShowAccount - oRBServices was null ");

  oRBServices.rawValue = 3;
  fShowAccount(oAccountRow, bOwned, bMLE);
}

// Called to make sure this is appropriately showing
function fShowAccount(oAccountRow, bOwned, bMLE) {
  var bNonSRF = !bOwned && !bMLE;
  // NON SRF
  // ACBS Loan, they shouldn't be able to see Account Transfers,
  // Credit Card, they also shouldn't be able to see Account Transfers
  var bPrivateBanking = geClientType.rawValue == 3;

  var oAction = oAccountRow.Action.takeAction;
  var oAcctType = oAccountRow.Account.one.AcctType;
  var oBDArb = oAccountRow.Account.one.AcctType.BDA;
  var oNISStype = oAccountRow.Account.one.AcctType.NISS;
  var oRBIStype = oAccountRow.Account.one.AcctType.RBIS;
  var oTransit = oAccountRow.Account.one.TransitNo;
  var oAcct = oAccountRow.Account.one.AccountNo;
  var oCurrency = oAccountRow.Account.currency;
  var oCCMsg = oAccountRow.Account.sfCCMessage;
  var oRBServices = oAccountRow.Account.two.Add;

  assert(oAction != null, "fShowAccount - oAction was null ");
  assert(oAcctType != null, "fShowAccount - oAcctType was null ");
  assert(oBDArb != null, "fShowAccount - oBDArb was null ");
  assert(oNISStype != null, "fShowAccount - oNISStype was null ");
  assert(oRBIStype != null, "fShowAccount - oRBIStype was null ");
  assert(oTransit != null, "fShowAccount - oTransit was null ");
  assert(oAcct != null, "fShowAccount - oAcct was null ");
  assert(oCCMsg != null, "fShowAccount - oCCMsg was null ");
  assert(oCurrency != null, "fShowAccount - oCurrency was null ");
  assert(oRBServices != null, "fShowAccount - oRBServices was null ");

  var oAddAllServices = oAccountRow.Account.two.Services.sfAddAllServices;
  var oDelAllServices = oAccountRow.Account.two.Services.sfDelAllServices; // includes question on delete/delete permanently
  assert(oAddAllServices != null, "fShowAccount - oAddAllServices was null ");
  assert(oDelAllServices != null, "fShowAccount - oDelAllServices was null ");

  var oDeletesMsg = oAccountRow.Account.two.Services.delServices;
  var oDeletemsg = oAccountRow.Account.two.Services.delServices.delTxt;
  var oDelAllmsg = oAccountRow.Account.two.Services.delServices.delAll;
  var oDelCoremsg = oAccountRow.Account.two.Services.delServices.delCore;
  assert(oDeletesMsg != null, "fShowAccount - oDeletesMsg was null ");
  assert(oDeletemsg != null, "fShowAccount - oDeletemsg was null ");
  assert(oDelAllmsg != null, "fShowAccount - oDelAllmsg was null ");
  assert(oDelCoremsg != null, "fShowAccount - oDelCoremsg was null ");

  var oHiInterest = oAccountRow.Account.two.Services.HI;
  assert(oHiInterest != null, "fShowAccount - oHiInterest was null ");

  var oSecTwo = oAccountRow.Account.two;
  var oSecThree = oAccountRow.Account.three;
  assert(oSecTwo != null, "fShowAccount - oSecTwo was null ");
  assert(oSecThree != null, "fShowAccount - oSecThree was null ");

  var bAdd = oAction.rawValue == 1;

  // Defaults/clearly set,i.e.,the majority...
  fQkDisplay(oTransit, true); // majority
  fDisplay(oHiInterest, false);
  fHide(oCCMsg);
  fDisplay(oRBServices, false);
  fHideServices(oAddAllServices);
  fHideServices(oDelAllServices);
  fHideShow(oDeletesMsg, !bAdd);
  fHide(oDelAllmsg);
  fHide(oDelCoremsg);

  // Private Banking
  fHideShow(oNISStype, bPrivateBanking);
  fHideShow(oRBIStype, bPrivateBanking);

  //fDisplay(oSecTwo,!bPrivateBanking);       // 190505 - PB like all else
  fDisplay(oSecTwo, true);

  fDisplay(oSecThree, bPrivateBanking && bAdd);

  oBDArb.caption.value.resolveNode("#text").value = bPrivateBanking
    ? "BDA / PDA"
    : "BDA";

  var oAllServices = bAdd ? oAddAllServices : oDelAllServices;

  //change acct no to acct no LOOK HERE XXXXXXXXXXXXXXXXXXXXXX

  oAcct.caption.value.text = aAcctNo;

  // Account Type
  switch (oAcctType.rawValue) {
    case "1": // BDA - Transit 5,Acct 7
      fDisplay(oCurrency, false);
      // 171004 - change the showing of services - essentially show all
      //        if (!bPrivateBanking) {     // 190114 - removed 190505
      fDisplay(oRBServices, true);
      fDisplay(oHiInterest, bAdd);

      //            if (bAdd) {
      fResetServices(oAllServices);
      switch (Number(oRBServices.rawValue)) {
        case 1: // all services - check all, make read-only
          fSetAddServicesValue(oAllServices, true);
          break;
        case 2: // all services
          fSetAddServicesValue(oAllServices, false);

          // Core services
          fSetAddServiceValue(oAllServices, 0, true); // Balance Reporting
          fSetAddServiceValue(oAllServices, 1, true); // Account Transfers      - 190422
          fSetAddServiceValue(oAllServices, 2, true); // Bill Payments
          fSetAddServiceValue(oAllServices, 3, true); // Stop Payments
          fSetAddServiceValue(oAllServices, 7, true); // RBC Statements
          fSetAddServiceValue(oAllServices, 9, true); // Account Images
          break;
        case 3: // all services
          break;
      }
      fHideAService(oAllServices, 10);
      //       }
      break;
    case "2": // OLBB - now ACBS - Transit 5,Acct 10 - changed to 11,130618    - "ACBS Loan"
      //    if (!bPrivateBanking) {     // 190114 - removed 190505
      fResetAService(oAllServices, 0); // Balance Reporting,on
      fHideShow(oDeletemsg, !bAdd);
      //    }
      //if (!bNonSRF)                     // for all
      //fResetAService(oAllServices,1);      // Account Transfers,off
      fDisplay(oCurrency, true);
      break;
    case "3": // OLMS, now Bus. Loan - Transit 5,Acct 10 - changed to 11,130618
      //change acct no to loan no LOOK HERE XXXXXXXXXXXXXXXXXXXXXX

      oAcct.caption.value.text = aLoanNo;

      //    if (!bPrivateBanking) {     // 190114 - removed 190505
      fResetAService(oAllServices, 0); // Balance Reporting,on
      if (bOwned && !bNonSRF && !bMLE) fResetAService(oAllServices, 1); // Account Transfers,on     190422

      if (!bNonSRF) fResetAService(oAllServices, 7); // RBC Statements,on     200821

      fHideShow(oDeletemsg, !bAdd);
      //    }
      fDisplay(oCurrency, true);
      break;
    case "4": // GIC - Transit blank,Acct digits/non-blank
      fDisplay(oCurrency, false);
      fDisplay(oTransit, false);
      //      if (!bPrivateBanking) {     // 190114 - removed 190505
      fResetAService(oAllServices, 0); // Balance Reporting,on
      //    fResetAService(oAllServices,1);      // Account Transfers,on     181112
      fHideShow(oDeletemsg, !bAdd);
      //      }
      break;
    case "5": // Credit Card - Transit blank,Acct
      fDisplay(oCurrency, false);
      fDisplay(oTransit, false);
      //    if (!bPrivateBanking) {     // 190114
      fResetAService(oAllServices, 0); // Balance Reporting,on

      // 3/16/19 - Our Maintenance team indicated that for the RBC Express Services – Non-Owned (MLE)Account,
      // When they select Add Account and the Account type is Credit Card , the Service (Account Transfers) should not be available
      // turn on only for bOwned, nonSRF, nonMLE accounts
      if (bOwned && !bNonSRF && !bMLE)
        //if (!bNonSRF)
        fResetAService(oAllServices, 1); // Account Transfers,off

      fResetAService(oAllServices, 7); // statements,off
      // fResetAService(oAllServices, 10);      // Paper Stmt Off,off   removed 190422
      fHideShow(oDeletemsg, !bAdd);
      //     }
      fShow(oCCMsg);
      break;
    case "6": // NISS (Money Market) - Transit blank,Acct 10
      fDisplay(oSecTwo, false); // no Services  190505

      fDisplay(oCurrency, false);
      fDisplay(oTransit, false);
      break;
    case "7": // RBIS (RRSP,RESP,TFSA,RRIF,Mutual Fund) - Transit blank,Acct 10 --- TBD
      fDisplay(oSecTwo, false); // no Services  190505

      fDisplay(oCurrency, false);
      fDisplay(oTransit, false);
      break;
  }

  fDisplay(oNonOwnedConfirm, bMLE && bNeedAttest());
}

// NOT NEEDED ... ????
function fChangedShowNonSRFAccount(oAccountRow) {
  fLog("XXXX WHO IS CALLING fChangedShowNonSRFAccount? XXX");
  /*
    var oRBServices = oAccountRow.Account.two.Add;
    assert(oRBServices != null, "fChangedShowAccount - oRBServices was null ");

    oRBServices.rawValue = 3;
    fShowAccount(oAccountRow,false,false);
    */
}

function fShowNonSRFAccount(oAccountRow) {
  // only change is services shown based on All/Core/Select
  var bPrivateBanking = Number(geClientType.rawValue) == 3;

  // 171004 - make act (like a subset) of owned, non-owned(MLE)
  var oAction = oAccountRow.Action.takeAction;
  assert(oAction != null, "fShowAccount - oAction was null ");

  var oRBServices = oAccountRow.Account.two.Add;
  var oAllServices = oAccountRow.Account.two.Services;
  assert(oRBServices != null, "fShowAccount - oRBServices was null ");
  assert(oAllServices != null, "fShowAccount - oAddAllServices was null ");

  var oAddAllServices = oAccountRow.Account.two.Services.sfAddAllServices;
  var oDelAllServices = oAccountRow.Account.two.Services.sfDelAllServices; // includes question on delete/delete permanently
  assert(oAddAllServices != null, "fShowAccount - oAddAllServices was null ");
  assert(oDelAllServices != null, "fShowAccount - oDelAllServices was null ");

  var oDeletesMsg = oAccountRow.Account.two.Services.delServices;
  var oDeletemsg = oAccountRow.Account.two.Services.delServices.delTxt;
  var oDelAllmsg = oAccountRow.Account.two.Services.delServices.delAll;
  var oDelCoremsg = oAccountRow.Account.two.Services.delServices.delCore;
  assert(oDeletesMsg != null, "fShowAccount - oDeletesMsg was null ");
  assert(oDeletemsg != null, "fShowAccount - oDeletemsg was null ");
  assert(oDelAllmsg != null, "fShowAccount - oDelAllmsg was null ");
  assert(oDelCoremsg != null, "fShowAccount - oDelCoremsg was null ");

  var oSecTwo = oAccountRow.Account.two;
  assert(oSecTwo != null, "fShowAccount - oSecTwo was null ");

  var bAdd = Number(oAction.rawValue) == 1;
  var iServices = Number(oRBServices.rawValue);

  fDisplay(oSecTwo, !bPrivateBanking);

  // Defaults/clearly set,i.e.,the majority...
  fHideShow(oDeletesMsg, !bAdd);
  fHide(oDelAllmsg);
  fHide(oDelCoremsg);

  if (bAdd) {
    fHideServices(oDelAllServices);
    fResetServices(oAddAllServices);

    switch (iServices) {
      case 1: // all services - check all, make read-only
        fSetAddServicesValue(oAddAllServices, true);
        break;
      case 2: // all services
        fSetAddServicesValue(oAddAllServices, false);

        // Core services
        fSetAddServiceValue(oAddAllServices, 0, true); // Balance Reporting
        fSetAddServiceValue(oAddAllServices, 3, true); // Stop Payments
        fSetAddServiceValue(oAddAllServices, 7, true); // RBC Statements
        fSetAddServiceValue(oAddAllServices, 9, true); // Account Images
        break;
      case 3: // all services
        break;
    }

    fHideAService(oAddAllServices, 1); // no Acct Transfers
    fHideAService(oAddAllServices, 2); // no Bill Payments
    fHideAService(oAddAllServices, 5); // no Wire Payments
    fHideAService(oAddAllServices, 8); // no Cheque Pro
  } else {
    // Deletion
    fHideServices(oDelAllServices);
    fHideServices(oAddAllServices);

    switch (iServices) {
      case 1: // all services
        fResetAServiceSet(oDelAllServices, 7, true, true); // Statements
        fResetAServiceSet(oDelAllServices, 9, true, true); // Account Imaging
        break;
      case 2: // core services
        fResetAServiceSet(oDelAllServices, 7, true, true); // Statements
        fResetAServiceSet(oDelAllServices, 9, true, true); // Account Imaging
        fShow(oDelCoremsg);
        fShow(oDeletemsg);
        break;
      case 3: // select services
        fResetServices(oDelAllServices);
        break;
    }

    fHideAService(oDelAllServices, 1); // no Acct Transfers
    fHideAService(oDelAllServices, 2); // no Bill Payments
    fHideAService(oDelAllServices, 5); // no Wire Payments
    fHideAService(oDelAllServices, 8); // no Cheque Pro
  }
}

function fCopyACHContactsPrevRow(oAccountRow) {
  // here as we need some of the stuff from fShowContactACHAccount
  // find the previous row by finding this row
  var iRow = oAccountRow.index;
  if (iRow < 1) return;
  assert(
    iRow >= 1,
    "need to be second or greater row - fCopyACHContactsPrevRow"
  );

  var oTable = oAccountRow.parent; // make generic so can handle Network Gateway table
  oRows = fGetAllTableRows(oTable.somExpression);
  var oPrevRow = oRows.item(iRow - 1);
  assert(oPrevRow != null, "previous row is null?  fCopyACHContactsPrevRow");

  // copy things over
  oAccountRow.AttrCol.Primary.cbPrimContact.rawValue =
    oPrevRow.AttrCol.Primary.cbPrimContact.rawValue;
  oAccountRow.AttrCol.Primary.info.name.rawValue =
    oPrevRow.AttrCol.Primary.info.name.rawValue;
  oAccountRow.AttrCol.Primary.info.email.rawValue =
    oPrevRow.AttrCol.Primary.info.email.rawValue;
  oAccountRow.AttrCol.Primary.info.phone.rawValue =
    oPrevRow.AttrCol.Primary.info.phone.rawValue;
  oAccountRow.AttrCol.Primary.info.fax.rawValue =
    oPrevRow.AttrCol.Primary.info.fax.rawValue;

  oAccountRow.AttrCol.Alternate.cbAltContact.rawValue =
    oPrevRow.AttrCol.Alternate.cbAltContact.rawValue;
  oAccountRow.AttrCol.Alternate.info.name.rawValue =
    oPrevRow.AttrCol.Alternate.info.name.rawValue;
  oAccountRow.AttrCol.Alternate.info.email.rawValue =
    oPrevRow.AttrCol.Alternate.info.email.rawValue;
  oAccountRow.AttrCol.Alternate.info.phone.rawValue =
    oPrevRow.AttrCol.Alternate.info.phone.rawValue;
  oAccountRow.AttrCol.Alternate.info.fax.rawValue =
    oPrevRow.AttrCol.Alternate.info.fax.rawValue;

  fShowContactACHAccount(oAccountRow, true);
}

function fShowContactACHAccount(oAccountRow, bTab2) {
  //    var oAction = oAccountRow.Action.takeAction;
  //    assert(oAction != null, "fShowContactACHAccount - oAction was null ");

  var iRow = oAccountRow.index;

  // Show Primary contact when checked or always on first row
  fDisplay(
    oAccountRow.AttrCol.Primary.info,
    oAccountRow.AttrCol.Primary.cbPrimContact.rawValue == 1
  );
  fDisplay(
    oAccountRow.AttrCol.Alternate.info,
    oAccountRow.AttrCol.Alternate.cbAltContact.rawValue == 1
  );

  // Show button tab 2, not tab 3 (or first row)
  fHideShow(oAccountRow.AttrCol.sfCopy, iRow != 0 && bTab2);
}

function fSetACHInputMethod(oSFRb) {
  var oRb = oSFRb.rbs;
  var osfCCQ = oSFRb.sf;
  assert(oRb != null, "fSetACHInputMethod - oRb was null ");
  assert(osfCCQ != null, "fSetACHInputMethod - osfCCQ was null ");

  var iRb = oRb.rawValue;
  var bSet = iRb == 2 || iRb == 3;

  fHideShow(osfCCQ, bSet);
}

function fShowACHAccount(oAccountRow) {
  var oAction = oAccountRow.Action.takeAction;
  assert(oAction != null, "fShowACHAccount - oAction was null ");

  var bModify = oAction.rawValue == 1;

  var oPDSoverPAP = oAccountRow.Account.ModifyStuff.format1.type;
  var oPrefunded = oAccountRow.Account.ModifyStuff.sfPF;
  var oLimits = oAccountRow.Account.ModifyStuff.sfLimits;
  var oLimitNote = oAccountRow.Account.ModifyStuff.sfLimitNote;
  var oPDSNote = oAccountRow.AttrCol.Control.sfPDSNote;
  var oBillingOptions =
    oAccountRow.AttrCol.Control.sfcbBillingOptions.sfRB.type;
  var oBasicNote = oAccountRow.AttrCol.Control.sfBasicNote;
  var osfInputMethod = oAccountRow.AttrCol.Control.sfInput.sfRB;
  assert(oPDSoverPAP != null, "fShowACHAccount - oPDSoverPAP was null ");
  assert(oPrefunded != null, "fShowACHAccount - oPrefunded was null ");
  assert(oLimits != null, "fShowACHAccount - oLimits was null ");
  assert(osfInputMethod != null, "fShowACHAccount - osfInputMethod was null ");

  // Delete only
  fDisplay(oAccountRow.Account.ModifyStuff, bModify);
  fDisplay(oAccountRow.AttrCol.Control, bModify);
  fDisplay(oAccountRow.AttrCol.DelText, !bModify); // Delete only

  if (!bModify) return;

  fDisplay(oPrefunded, oPDSoverPAP.rawValue == 1); // PDS
  fDisplay(oPDSNote, oPDSoverPAP.rawValue == 1); // PDS
  fDisplay(
    oLimits,
    oPrefunded.Prefunded.rawValue == 1 ||
      oPrefunded.Prefunded.rawValue == 2 ||
      oPDSoverPAP.rawValue == 2
  ); //Daily Limit, Prefunding, PAP
  fDisplay(oLimitNote, oPrefunded.Prefunded.rawValue == 1); //Daily Limit
  fDisplay(oBasicNote, oBillingOptions.rawValue == 1); // Basic (Pay as you go)
  fDisplay(
    oAccountRow.AttrCol.Control.sfCurrency,
    oAccountRow.AttrCol.Control.cbControl.rawValue == 1
  ); // show currency choice
  fDisplay(
    oAccountRow.AttrCol.Control.info,
    oAccountRow.AttrCol.Control.cbControl.rawValue == 1
  ); // show transit/acct #'s

  fSetACHInputMethod(osfInputMethod);
}

// Called to make sure this is appropriately showing

function fShowDeleteAccount(oAccountRow) {
  var bPrivateBanking = geClientType.rawValue == 3;

  var oAcctType = oAccountRow.Account.one.sfAcctType.sfAT.AcctType;
  var oBDArb = oAccountRow.Account.one.sfAcctType.sfAT.AcctType.BDA;
  var oNISStype = oAccountRow.Account.one.sfAcctType.sfAT.AcctType.NISS;
  var oRBIStype = oAccountRow.Account.one.sfAcctType.sfAT.AcctType.RBIS;
  var oAcctOwn = oAccountRow.Account.one.sfAcctType.sfOwnership;
  var oAcctOwnType = oAccountRow.Account.one.sfAcctType.sfOwnership.rbOwnership;
  assert(oAcctType != null, "fShowDeleteAccount - oAcctType was null ");
  assert(oBDArb != null, "fShowDeleteAccount - oBDArb was null ");
  assert(oNISStype != null, "fShowDeleteAccount - oNISStype was null ");
  assert(oRBIStype != null, "fShowDeleteAccount - oRBIStype was null ");
  assert(oAcctOwn != null, "fShowDeleteAccount - oAcctOwn was null ");
  assert(oAcctOwnType != null, "fShowDeleteAccount - oAcctOwnType was null ");

  var oMLEName = oAccountRow.Account.one.sfDetails.MLEName;
  var oSchedB = oAccountRow.Account.one.sfDetails.cbSchedB;
  var oSRF = oAccountRow.Account.one.sfDetails.SRF;
  var oTransit = oAccountRow.Account.one.sfDetails.TransitNo;
  var oAcctNo = oAccountRow.Account.one.sfDetails.AccountNo;
  assert(oMLEName != null, "fShowDeleteAccount - oMLEName was null ");
  assert(oSchedB != null, "fShowDeleteAccount - oSchedB was null ");
  assert(oSRF != null, "fShowDeleteAccount - oSRF was null ");
  assert(oTransit != null, "fShowDeleteAccount - oTransit was null ");
  assert(oTransit != null, "fShowDeleteAccount - oTransit was null ");

  var oCCMsg = oAccountRow.Account.one.CCMessage;
  var oRBServices = oAccountRow.Account.two.sfServices.rbSvcType;
  var oAllServices = oAccountRow.Account.two.sfAllServices;
  var oDelAllmsg = oAccountRow.Account.two.delServices.delAll;
  var oDelCoremsg = oAccountRow.Account.two.delServices.delCore;
  var oSecTwo = oAccountRow.Account.two;
  var oACMMsg = oAccountRow.Account.delACHmsg;
  assert(oCCMsg != null, "fShowDeleteAccount - oCCMsg was null ");
  assert(oRBServices != null, "fShowDeleteAccount - oRBServices was null ");
  assert(oAllServices != null, "fShowDeleteAccount - oAllServices was null ");
  assert(oDelAllmsg != null, "fShowDeleteAccount - oDelAllmsg was null ");
  assert(oDelCoremsg != null, "fShowDeleteAccount - oDelCoremsg was null ");
  assert(oACMMsg != null, "fShowDeleteAccount - oACMMsg was null ");

  fQkDisplay(oTransit, true); // majority

  fHide(oCCMsg);
  fDisplay(oRBServices, false);
  fHideServices(oAllServices);
  fHide(oDelAllmsg);
  fHide(oDelCoremsg);
  fDisplay(oSecTwo, true);
  fHide(oACMMsg);
  fHideShow(oNISStype, bPrivateBanking);
  fHideShow(oRBIStype, bPrivateBanking);
  //fDisplay(oSecTwo,!bPrivateBanking);
  fDisplay(oSecTwo, true); // Services for PB  190505

  oBDArb.caption.value.resolveNode("#text").value = bPrivateBanking
    ? "BDA / PDA"
    : "BDA";

  // Ownership types
  var iAcctType = oAcctType.rawValue;
  switch (iAcctType) {
    case "1":
    case "2":
    case "3":
    case "4":
    case "5":
      fDisplay(oAcctOwn, true);
      break;
    default:
      fDisplay(oAcctOwn, false);
      break;
  }
  var iOwnerType = oAcctOwnType.rawValue;
  fQkDisplay(oMLEName, iOwnerType == 2); // Truly required?
  fQkDisplay(oSchedB, iOwnerType == 2); // Truly required?
  fQkDisplay(oSRF, iOwnerType == 2 || iOwnerType == 3);

  // Now, based on Account type
  switch (iAcctType) {
    case "1": // BDA - Transit 5,Acct 7
      fDisplay(oRBServices, true);
      fHideShow(oDelAllmsg, oRBServices.rawValue == 1);
      fHideShow(oDelCoremsg, oRBServices.rawValue == 2);
      if (oRBServices.rawValue == 1) {
        fResetAService(oAllServices, 7); // Statements
        fResetAService(oAllServices, 9); // Account Imaging
      } else if (oRBServices.rawValue == 2) {
        fResetAService(oAllServices, 7); // Statements
        fResetAService(oAllServices, 9); // Account Imaging
      } else {
        fResetServices(oAllServices); // all showing
      }
      break;
    case "2": // OLBB - Transit 5,Acct 10 - changed to 11,130618
      fResetAService(oAllServices, 0); // Balance Reporting,on
      fResetAService(oAllServices, 1); // Account Transfers,off
      break;
    case "3": // OLMS - Transit 5,Acct 10 - changed to 11,130618
      fResetAService(oAllServices, 0); // Balance Reporting,on
      break;
    case "4": // GIC - Transit blank,Acct digits/non-blank
      fDisplay(oTransit, false);
      fResetAService(oAllServices, 0); // Balance Reporting,on
      break;
    case "5": // Credit Card - Transit blank,Acct 16
      fDisplay(oTransit, false);
      fResetAService(oAllServices, 0); // Balance Reporting,on
      fResetAService(oAllServices, 1); // Account Transfers,off
      fResetAService(oAllServices, 7); // statements,off
      fShow(oCCMsg);
      break;
    case "6": // NISS (Money Market) - Transit blank,Acct 10
      fDisplay(oSecTwo, false); // no Services  190505
      fDisplay(oTransit, false);
      break;
    case "7": // RBIS (RRSP,RESP,TFSA,RRIF,Mutual Fund) - Transit blank,Acct 10 --- TBD
      fDisplay(oSecTwo, false); // no Services  190505
      fDisplay(oTransit, false);
      break;
    case "8": // ACH - not there anymore...
      fDisplay(oSecTwo, false); // no Services  190505
      fDisplay(oTransit, false);
      fDisplay(oSecTwo, false);
      fShow(oACMMsg);
      break;
  }
}

function fRightDeleteAccounts(oTbl) {
  var vRows = fGetAllTableRows(oTbls.somExpression);
  for (var i = 0; i < vRows.length; i++) {
    // loop through rows
    var oRadioB = vRows.item(i).Action.takeAction;
    iAdds += oRadioB.rawValue == 1 ? 1 : 0;
  }
}

// returns validation if no showing checkboxes are selected
function fValidateAtLeastOneService(oCb) {
  var oSf = oCb.parent.parent;
  if (!fShowing(oSf)) return true;
  var vList = xfa.resolveNodes(oSf.somExpression + ".sfSvc[*]");
  assert(vList.length > 0, "fValidateAtLeastOneService - wrong list of stuff");
  for (var i = 0; i < vList.length; i++) {
    // loop through rows
    var ocbSF = vList.item(i);
    if (fShowing(ocbSF)) {
      var oCB = ocbSF.cb;
      if (oCB.rawValue == 1) {
        // showing and 'on' - then at least one is selected
        return true;
      }
    }
  }
  return false;
}

// EDI Direct
function fEDIPayRcvrSet() {
  var ePayRcvrSvc = oEDIPaymentReceiver.sfSvcSelect.ddl.rawValue;

  fDisplay(oEDIPaymentReceiver.sfRcvLinkOptions, false);
  fDisplay(oEDIPaymentReceiver.sfRcvDirectOptions, false);
  fDisplay(oEDIPaymentReceiver.sfInfoDirectOptions, false);
  fDisplay(oEDIPaymentReceiver.sfEDIRcvrOptions, false);
  fDisplay(oEDIPaymentReceiver.sfCustomOptions, false);

  switch (ePayRcvrSvc) {
    case "1": // Receivables Link
      fDisplay(oEDIPaymentReceiver.sfRcvLinkOptions, true);
      break;
    case "2": // Receivables Direct
      fDisplay(oEDIPaymentReceiver.sfRcvDirectOptions, true);
      break;
    case "3": // Information Direct
      fDisplay(oEDIPaymentReceiver.sfInfoDirectOptions, true);
      break;
    case "4": // EDI Payment Receiver (Incl. R*EDI* Mail / R*EDI* Fax Services)
      fDisplay(oEDIPaymentReceiver.sfEDIRcvrOptions, true);
      break;
    case "5": // Customization (Please contact Sales Support)
      fDisplay(oEDIPaymentReceiver.sfCustomOptions, true);
      break;
    default:
      // ???
      fLog("fEDIPayRcvrSet - bad value " + ePayRcvrSvc);
      break;
  }
}

// CEPAS
function fCEPASSet() {
  var eCEPASSvc = oCEPAS.sfSvcSelect.ddl.rawValue;

  fDisplay(oCEPAS.sfBAI, false);
  fDisplay(oCEPAS.sfCAMT, false);
  fDisplay(oCEPAS.sfSWIFT, false);
  fDisplay(oCEPAS.sf821, false);
  fDisplay(oCEPAS.sfGlobal, false);
  fDisplay(oCEPAS.sfAPLink, false);

  switch (eCEPASSvc) {
    case "1":
      fDisplay(oCEPAS.sfBAI, true);
      break;
    case "2":
      fDisplay(oCEPAS.sfCAMT, true);
      break;
    case "3":
      fDisplay(oCEPAS.sfSWIFT, true);
      break;
    case "4":
      fDisplay(oCEPAS.sf821, true);
      break;
    case "5":
      fDisplay(oCEPAS.sfGlobal, true);
      break;
    case "6":
      fDisplay(oCEPAS.sfAPLink, true);
      break;
    default:
      // ???
      fLog("fCEPASSet - bad value " + eCEPASSvc);
      break;
  }
  fBaltranTest();
}

// RBC Express site is required field if BALTRAN (version 3)
function fBaltranTest() {
  var eCEPASSvc = oCEPAS.sfSvcSelect.ddl.rawValue;
  var bV3 = false;

  switch (eCEPASSvc) {
    case "1":
      bV3 |= oCEPAS.sfBAI.ApplyAll.rawValue == 3;
      bV3 |= oCEPAS.sfBAI.cbCD.rawValue == 1;
      break;
    case "2":
      bV3 |= oCEPAS.sfCAMT.cb052.rawValue == 1;
      bV3 |= oCEPAS.sfCAMT.cb053.rawValue == 1;
      bV3 |= oCEPAS.sfCAMT.cb054.rawValue == 1;
      break;
    case "3":
      bV3 |= oCEPAS.sfSWIFT.sfFinSwift.cb940.rawValue == 1;
      bV3 |= oCEPAS.sfSWIFT.sfFinSwift.cb942.rawValue == 1;
      break;
    case "4":
      bV3 |= oCEPAS.sf821.sfSvcSelB.ApplyAll.rawValue == 3;
      break;
    case "5":
      break;
    case "6":
      break;
    default:
      // ???
      fLog("fBaltranTest - bad value " + eCEPASSvc);
      break;
  }
  fSetNullTestTo(oCEPAS.sfCompanyGeneral.tbRBCxSite, !bV3);
}

// EDI Originator
function fEDIPayOrigSet() {
  var ePayOrigSvc = oEDIPaymentOriginator.sfSvcSelect.ddl.rawValue;

  fDisplay(oEDIPaymentOriginator.sfAPOptions, false);
  fDisplay(oEDIPaymentOriginator.sfPDEDIOptions, false);
  fDisplay(oEDIPaymentOriginator.sfPDXMLOptions, false);
  fDisplay(oEDIPaymentOriginator.sfMoreXML, false);
  fDisplay(oEDIPaymentOriginator.sfFirst3, false);
  fDisplay(oEDIPaymentOriginator.sfBillPayRSvc, false);
  fDisplay(oEDIPaymentOriginator.sfAttachments, true);
  fDisplay(oEDIPaymentOriginator.sfTradePayments, false);

  var vRows = fGetAllTableRows(
    oEDIPaymentOriginator.sfAccounts.sfAccountsTable.tbl.somExpression
  );
  for (var i = 0; i < vRows.length; i++) {
    // loop through rows
    fDisplay(vRows.item(i).sfServiceColumn.sfGSAN, false);
  }

  var bSeeGSAN = false;
  var bFEDI = false;
  var bFEDIreadonly = false;

  switch (ePayOrigSvc) {
    case "1": // AP Link
      for (var i = 0; i < vRows.length; i++) {
        // loop through rows
        b = vRows.item(i).sfServiceColumn.sfMainServices.cbPAP.rawValue == 1;
        b |= vRows.item(i).sfServiceColumn.sfMainServices.cbPDS.rawValue == 1;
        fDisplay(vRows.item(i).sfServiceColumn.sfGSAN, b);
      }

      bFEDI = oEDIPaymentOriginator.sfAPOptions.sfTop.cbFEDI.rawValue == "1";

      fDisplay(
        oEDIPaymentOriginator.sfAPOptions.sfTop.ddProcCtr,
        oEDIPaymentOriginator.sfAPOptions.sfTop.cbACHDDPDS.rawValue == 1 ||
          oEDIPaymentOriginator.sfAPOptions.sfTop.cbACHDPPAP.rawValue == 1
      );
      fDisplay(
        oEDIPaymentOriginator.sfAPOptions.sfTop.sfNotes.sfACHAck,
        oEDIPaymentOriginator.sfAPOptions.sfTop.cbACHDDPDS.rawValue == 1 ||
          oEDIPaymentOriginator.sfAPOptions.sfTop.cbACHDPPAP.rawValue == 1
      );

      fDisplay(oEDIPaymentOriginator.sfAPOptions, true);
      fDisplay(oEDIPaymentOriginator.sfFirst3, true);
      break;
    case "2": // PD - EDI
      for (var i = 0; i < vRows.length; i++) {
        // loop through rows
        b = vRows.item(i).sfServiceColumn.sfMainServices.cbPAP.rawValue == 1;
        b |= vRows.item(i).sfServiceColumn.sfMainServices.cbPDS.rawValue == 1;
        fDisplay(vRows.item(i).sfServiceColumn.sfGSAN, b);
      }

      bFEDI = oEDIPaymentOriginator.sfPDEDIOptions.sfTop.cbFEDI.rawValue == "1";

      fDisplay(oEDIPaymentOriginator.sfPDEDIOptions.sfTop.sfFirst, bFEDI);

      fDisplay(
        oEDIPaymentOriginator.sfPDEDIOptions.sfTop.ddProcCtr,
        oEDIPaymentOriginator.sfPDEDIOptions.sfTop.cbACHDDPDS.rawValue == 1 ||
          oEDIPaymentOriginator.sfPDEDIOptions.sfTop.cbACHDPPAP.rawValue == 1
      );
      fDisplay(
        oEDIPaymentOriginator.sfPDEDIOptions.sfTop.sfACHAck,
        oEDIPaymentOriginator.sfPDEDIOptions.sfTop.cbACHDDPDS.rawValue == 1 ||
          oEDIPaymentOriginator.sfPDEDIOptions.sfTop.cbACHDPPAP.rawValue == 1
      );

      fDisplay(oEDIPaymentOriginator.sfPDEDIOptions, true);
      fDisplay(oEDIPaymentOriginator.sfFirst3, true);
      break;
    case "3": // PD - XML
      for (var i = 0; i < vRows.length; i++) {
        // loop through rows
        b = vRows.item(i).sfServiceColumn.sfMainServices.cbPAP.rawValue == 1;
        b |= vRows.item(i).sfServiceColumn.sfMainServices.cbPDS.rawValue == 1;
        fDisplay(vRows.item(i).sfServiceColumn.sfGSAN, b);
      }

      bFEDI = oEDIPaymentOriginator.sfPDXMLOptions.sfTop.cbFEDI.rawValue == "1";
      fDisplay(oEDIPaymentOriginator.sfPDXMLOptions.sfTop.sfFirst, bFEDI);
      fDisplay(
        oEDIPaymentOriginator.sfPDXMLOptions.sfTop.ddProcCtr,
        oEDIPaymentOriginator.sfPDXMLOptions.sfTop.cbACHDDPDS.rawValue == 1 ||
          oEDIPaymentOriginator.sfPDXMLOptions.sfTop.cbACHDPPAP.rawValue == 1
      );
      fDisplay(
        oEDIPaymentOriginator.sfPDXMLOptions.sfTop.sfACHAck,
        oEDIPaymentOriginator.sfPDXMLOptions.sfTop.cbACHDDPDS.rawValue == 1 ||
          oEDIPaymentOriginator.sfPDXMLOptions.sfTop.cbACHDPPAP.rawValue == 1
      );
      fDisplay(oEDIPaymentOriginator.sfPDXMLOptions, true);
      fDisplay(oEDIPaymentOriginator.sfFirst3, true);
      fDisplay(oEDIPaymentOriginator.sfMoreXML, true);

      break;
    case "4": // SEDAR
      bFEDI = true;
      bSeeGSAN = false;
      bFEDIreadonly = true;

      fDisplay(oEDIPaymentOriginator.sfTradePayments, true);

      break;
    case "5": // Bill payment remittance service
      for (var i = 0; i < vRows.length; i++) {
        // loop through rows
        b = vRows.item(i).sfServiceColumn.sfMainServices.cbPAP.rawValue == 1;
        b |= vRows.item(i).sfServiceColumn.sfMainServices.cbPDS.rawValue == 1;
        fDisplay(vRows.item(i).sfServiceColumn.sfGSAN, b);
      }

      fDisplay(oEDIPaymentOriginator.sfBillPayRSvc, true);
      break;
    case "6": // EDI Payment Originator
      bFEDI = true;
      bSeeGSAN = false;
      bFEDIreadonly = true;

      fDisplay(oEDIPaymentOriginator.sfTradePayments, true);

      break;
    default:
      fLog("fEDIPayOrigSet - bad value " + ePayOrigSvc);
      bSeeGSAN = false;
      break;
  }

  fDisplay(oEDIPaymentOriginator.sfTransRisk, bFEDI);

  fDisplay(oEDIPaymentOriginator.sfAccounts, true);
  fDisplay(oEDIPaymentOriginator.sfComments, true);

  for (var i = 0; i < vRows.length; i++) {
    // loop through rows
    fDisplay(vRows.item(i).sfServiceColumn.sfOtherServices, bFEDIreadonly);
    fDisplay(vRows.item(i).sfServiceColumn.sfMainServices, !bFEDIreadonly);
  }
}

//Payee Match Accounts Table

function fPMAccountsChange(choice, oRow) {
  fLog("fPMAccountsChange " + choice);

  if (choice == 1) {
    fDisplay(oRow.sfAcct.sfChequeIssuance, true);
    fHide(oRow.sfAcct.sfLast.rbDefaultDecision.NoChange);

    // Code to make some fields required
    fSetNullTestTo(oRow.sfAcct.sfFirst.TransitNo, false); // make required
    fSetNullTestTo(oRow.sfAcct.sfFirst.AccountNo, false);
    fSetNullTestTo(oRow.sfAcct.sfFirst.AccountName, false);
    fSetNullTestTo(oRow.sfAcct.sfFirst.AccountShortName, false);
    fSetNullTestTo(oRow.sfAcct.sfFirst.CustomerID, false);
    fSetNullTestTo(oRow.sfAcct.sfFirst.ProcessingCentre, false);
    fSetNullTestTo(oRow.sfAcct.sfFirst.rbVerify, false);
    fSetNullTestTo(oRow.sfAcct.sfEMailOne.EMailOne, false);
    fSetNullTestTo(oRow.sfAcct.sfLast.rbNullNotification, false);
    fSetNullTestTo(oRow.sfAcct.sfLast.rbDefaultDecision, false);
    fSetNullTestTo(oRow.sfAcct.sfEndAccts.rbChequesMonth, false);
    fSetNullTestTo(oRow.sfAcct.sfChequeIssuance.rbChequeIssuance, false);
    fSetNullTestTo(oRow.sfAcct.sfSerial.Serial, false);

    splitOutBigString(stringify(vaFldTest)); // and save for next time
  } else {
    fDisplay(oRow.sfAcct.sfChequeIssuance, false);
    fShow(oRow.sfAcct.sfLast.rbDefaultDecision.NoChange);

    fSetNullTestTo(oRow.sfAcct.sfFirst.TransitNo, true); // make not required
    fSetNullTestTo(oRow.sfAcct.sfFirst.AccountNo, true);
    fSetNullTestTo(oRow.sfAcct.sfFirst.AccountName, true);
    fSetNullTestTo(oRow.sfAcct.sfFirst.AccountShortName, true);
    fSetNullTestTo(oRow.sfAcct.sfFirst.CustomerID, true);
    fSetNullTestTo(oRow.sfAcct.sfFirst.ProcessingCentre, true);
    fSetNullTestTo(oRow.sfAcct.sfFirst.rbVerify, true);
    fSetNullTestTo(oRow.sfAcct.sfEMailOne.EMailOne, true);
    fSetNullTestTo(oRow.sfAcct.sfLast.rbNullNotification, true);
    fSetNullTestTo(oRow.sfAcct.sfLast.rbDefaultDecision, true);
    fSetNullTestTo(oRow.sfAcct.sfEndAccts.rbChequesMonth, true);
    fSetNullTestTo(oRow.sfAcct.sfChequeIssuance.rbChequeIssuance, true);
    fSetNullTestTo(oRow.sfAcct.sfSerial.Serial, true);

    splitOutBigString(stringify(vaFldTest)); // and save for next time
  }
}

//Payee Match Admin Table

function fPMAdminsChange(choice, oRow) {
  fLog("fPMAdminsChange " + choice);
  if (choice == 1) {
    // Code to make some fields required
    fSetNullTestTo(oRow.sfAdmin.TableContent.AdminUserName, false); // make required
    fSetNullTestTo(oRow.sfAdmin.TableContent.FirstName, false);
    fSetNullTestTo(oRow.sfAdmin.TableContent.LastName, false);
    fSetNullTestTo(oRow.sfAdmin.TableContent.Phone, false);
    fSetNullTestTo(oRow.sfAdmin.TableContent.EMail, false);
    fSetNullTestTo(oRow.sfAdmin.TableContent.rbLanguage, false);

    splitOutBigString(stringify(vaFldTest)); // and save for next time
  } else {
    fSetNullTestTo(oRow.sfAdmin.TableContent.AdminUserName, true); // make not required
    fSetNullTestTo(oRow.sfAdmin.TableContent.FirstName, true);
    fSetNullTestTo(oRow.sfAdmin.TableContent.LastName, true);
    fSetNullTestTo(oRow.sfAdmin.TableContent.Phone, true);
    fSetNullTestTo(oRow.sfAdmin.TableContent.EMail, true);
    fSetNullTestTo(oRow.sfAdmin.TableContent.rbLanguage, true);

    splitOutBigString(stringify(vaFldTest)); // and save for next time
  }
}

function fbDDLMT101(oDD) {
  var oDD1 = oDD.parent.ddMsgType1;
  var oDD2 = oDD.parent.ddMsgType2;
  var oDD3 = oDD.parent.ddMsgType3;
  var oDD4 = oDD.parent.ddMsgType4;
  var oDD5 = oDD.parent.ddMsgType5;

  assert(oDD1 != null, "fShowSWIFTMsgTypes - oDD1 not found");
  assert(oDD2 != null, "fShowSWIFTMsgTypes - oDD2 not found");
  assert(oDD3 != null, "fShowSWIFTMsgTypes - oDD3 not found");
  assert(oDD4 != null, "fShowSWIFTMsgTypes - oDD4 not found");
  assert(oDD5 != null, "fShowSWIFTMsgTypes - oDD5 not found");

  var b1MT101 = fIsMT101(oDD1);
  var b2MT101 = fIsMT101(oDD2);
  var b3MT101 = fIsMT101(oDD3);
  var b4MT101 = fIsMT101(oDD4);
  var b5MT101 = fIsMT101(oDD5);

  return b1MT101 || b2MT101 || b3MT101 || b4MT101 || b5MT101;
}

function fbDDLMTxxx(oDD) {
  var oDD1 = oDD.parent.ddMsgType1;
  var oDD2 = oDD.parent.ddMsgType2;
  var oDD3 = oDD.parent.ddMsgType3;
  var oDD4 = oDD.parent.ddMsgType4;
  var oDD5 = oDD.parent.ddMsgType5;

  assert(oDD1 != null, "fShowSWIFTMsgTypes - oDD1 not found");
  assert(oDD2 != null, "fShowSWIFTMsgTypes - oDD2 not found");
  assert(oDD3 != null, "fShowSWIFTMsgTypes - oDD3 not found");
  assert(oDD4 != null, "fShowSWIFTMsgTypes - oDD4 not found");
  assert(oDD5 != null, "fShowSWIFTMsgTypes - oDD5 not found");

  var b1MTxxx = fIsMTxxx(oDD1);
  var b2MTxxx = fIsMTxxx(oDD2);
  var b3MTxxx = fIsMTxxx(oDD3);
  var b4MTxxx = fIsMTxxx(oDD4);
  var b5MTxxx = fIsMTxxx(oDD5);

  return b1MTxxx || b2MTxxx || b3MTxxx || b4MTxxx || b5MTxxx;
}

// SWIFT //
function fShowSWIFTMsgTypes(oDD) {
  assert(
    oDD != null,
    "fShowSWIFTMsgTypes - now needs to be called with any of the dropdowns as an argument"
  );

  // 171221 - removed showing anything if MT101 - as used to on enrolment form - now we've got an entire form for Send MT101
  var osfOtherMT = oDD.parent.parent.sfOtherMT;
  assert(osfOtherMT != null, "fShowSWIFTMsgTypes - sfOtherMT not found");

  var bSelMtxxx = fbDDLMTxxx(oDD);
  fDisplay(osfOtherMT, bSelMtxxx);
}

function fIsMT101(o) {
  if (fFldStringEmpty(o)) return false;
  return o.rawValue == "MT101";
}
function fIsMTxxx(o) {
  if (fFldStringEmpty(o)) return false;
  return !fIsMT101(o);
}

// Called from a remove button to figure if this item has more than one instance
function fMoreThanOne(oTableObj) {
  var aSOM = oTableObj.somExpression;
  var vList = fGetAllTableRows(aSOM);
  var iCount = vList.length;
  if (iCount <= 1) {
    app.alert(msgAlertNoRemove);
  }
  return iCount > 1;
}

function fMoreThan(oTableObj, iMax) {
  var aSOM = oTableObj.somExpression;
  var vList = fGetAllTableRows(aSOM);
  if (vList.length >= iMax) {
    app.alert(msgAlertNoMoreThan + iMax);
    return true;
  }
  return false;
}

function fClickKLinkFeedback() {
  if (bEN) {
    app.launchURL(
      "http://rbcnet.fg.acme.com/cashmanagement/cid-83318.html",
      true
    );
  } else {
    app.launchURL(
      "http://rbcnet.fg.acme.com/cashmanagement_fr/cid-83608.html",
      true
    );
  }
}

function fShowHideCountry(rb) {
  fDisplay(rb.parent.OtherCountry, rb.rawValue == 3);
}

/*************************/
/***** eMail Routing *****/
/*************************/

// Already validated
// Already have avEmailForms completed - dictionary by email - with all forms for each email
// tab 3 only
// Loop through each email address (in future could sort first)
//  - show only email forms
//   - display msg on tab3 of what forms being shown
//   - compute subject line with what forms being shown
//   - send
// Show all forms again,but leave w/ tab 3 only

function fHideAllForms() {
  fLog("fHideAllForms");
  for (i = 0; i < vaServices.length; i++) {
    var aServiceArea = vaServices[i];
    var vRows = aServiceArea["rows"];
    for (j = 0; j < vRows.length; j++) {
      var aRow = vRows[j];
      var oForm = aRow["form"];
      fHide(oForm);
    }
  }
}


/****************************/
/****** EMail Handling ******/
/****************************/

function fDoMultiEMail(cDoc) {
  fLog("fDoMultiEMail");
  fDescribeavEmailForms();

  // Special case for ACH Direct approval workflow
  var bUserCanApprove = oACHDepositICanApprove.rawValue == 1;
  var bSwitchACHEmails = !bUserCanApprove;
  var aApproverEmail = fTrim(oACHDepositApproverEmail.rawValue);
  if (bSwitchACHEmails) {
    //fLog("switching from PDS email to "+aApproverEmail);
  }

  var iEMails = countEmailsToSend();

  if (iEMails == 0) {
    app.alert(msgNoEmails);
    return;
  }

  if (iEMails > 1) app.alert(msgMultiEmails);

  // Tab 3 only
  fHide(oTabTab1);
  fHide(oTabTab2);
  fHide(oTab3ReqInstructions);
  fShow(oTab3ProcInstructions);

  // Sandwich read-only
  // Loop through each email address - showing that form
  for (var aEmail in avEmailForms) {
    fLog("fDoMultiEMail - to " + aEmail);

    var dctSeenForms = {};

    // Show only appropriate forms

    fHideAllForms();
    fHideAllCommonSubSections(); // As parts pertain only to that routing email

    var aFormList = "";
    var vaForms = avEmailForms[aEmail];
    for (var i = 0; i < vaForms.length; i++) {
      // loop through all the forms, note Common forms shown here
      var aForm = vaForms[i];
      var oForm = aForm.form;
      fShow(oForm);
      fFormMakeReadOnly(oForm);

      var aName = aForm.name;
      if (!(aName in dctSeenForms)) {
        // don't show duplicates, e.g., change contact information
        aFormList += aName + ",";
      }
      dctSeenForms[aName] = "seen";
    }

    fShowCommonSubSections(aEmail); // Show what's inside of each commons for this routing

    if (aFormList.length > 2)
      aFormList = aFormList.substring(0, aFormList.length - 1);

    fLog("forms list is " + aFormList);
    oTabListForms.rawValue = aFormList;
    var aSubject =
      msgSubject +
      aFormList +
      " - " +
      geClientSRF.rawValue +
      "/" +
      geClientName.rawValue;
    var aBody = msgBody;

    if (aEmail == aToPDS) {
      // changes
      fLog("checking to " + aToPDS);
      var aType =
        oACHDepositType.rawValue == 1
          ? msgACHTypePrefunding
          : msgACHTypeTemporary;
      if (bUserCanApprove) {
        // user can approve
        fLog("ACH DD - user can approve");
        aSubject =
          msgApproved +
          aType +
          " - " +
          geClientSRF.rawValue +
          "/" +
          geClientName.rawValue;
      } else {
        // requires approval
        fLog("ACH DD - need additional approver");
        aEmail = aEmail.replace(aToPDS, aApproverEmail);

        aSubject =
          msgSubjectAppRequest +
          aType +
          " - " +
          geClientSRF.rawValue +
          "/" +
          geClientName.rawValue;
        aBody = msgBodyAppRequest;

        fLog("ACH Switching - replacement email to: " + aEmail);

        fDisplay(oACHDepositApproverSection, true);
        fFormMakeReadWrite(oACHDepositApproverSection);
      }
    }

    var bToCCHost = false;
    if (aEmail == aToCC) {
      fLog("checking to " + aToCC);
      var bModify = oCC.sfActions.rbActions.rawValue == 1;

      var bCheckDigit = oCCFirst.sfCheckDigit.sfCB.cb.rawValue == 1;
      var bCheckDigitAdd =
        oCCFirst.sfCheckDigit.sfWhenChecked.sfCDRQ.rb.rawValue == 1;
      var bToCCHost = bModify && bCheckDigit && bCheckDigitAdd;

      aSubject =
        msgSubjectCCRequest +
        "/" +
        geClientSRF.rawValue +
        "/" +
        geClientName.rawValue;

      if (bToCCHost) {
        fLog("adding on email " + aToCCTHost);
        aEmail += ";" + aToCCTHost;
      }
    }

    // Should we send to Corpore ECom ???
    var bToCECom = false;
    if (aEmail == aToCC) {
      fLog("checking (second time) to " + aToCC);

      var bModify = oCC.sfActions.rbActions.rawValue == 1;
      var bDelete = oCC.sfActions.rbActions.rawValue == 2;

      var bDeleteCC = oCC.sfDeleteProfile.sfTop.rbConcentrator.rawValue == 1;
      fLog("bDeleteCC - " + bDeleteCC);
      bDeleteCC = bDeleteCC && bDelete;

      var bACCCsf = oCCFirst.sfAcctChange.sfCB.cb.rawValue == 1;
      var bACCC =
        oCCFirst.sfAcctChange.sfWhenChecked.rbConcentrator.rawValue == 1;
      bACCC = bACCCsf && bACCC && bModify;

      var bCIPRCI = oCCFirst.sfCPRDCI.sfCB.cb.rawValue == 1;
      bCIPRCI = bCIPRCI && bModify;

      var bCILBsf = oCCFirst.sfLeadBank.sfCB.cb.rawValue == 1;
      var bCILB =
        oCCFirst.sfLeadBank.sfWhenChecked.rbConcentrator.rawValue == 1;
      bCILB = bCILBsf && bCILB && bModify;

      bToCECom = bDeleteCC || bACCC || bCIPRCI || bCILB;

      aSubject =
        msgSubjectCCRequest +
        "/" +
        geClientSRF.rawValue +
        "/" +
        geClientName.rawValue;

      if (bToCECom) {
        fLog("adding on email " + aToCorpECom);
        aEmail += ";" + aToCorpECom;
      }
    }

    var aUrl = "mailto:" + aEmail + "?subject=" + aSubject + "&body=" + aBody;

    fLog("pre diac: " + aUrl);
    aUrl = removeDiacritics(aUrl);
    fLog("EMAIL to " + aUrl);
    //Removed comment out for debugging 170922

    cDoc.submitForm({
      // mailForm fails security test for some reason...
      cURL: encodeURI(aUrl), // side effect is that the form is saved,i.e.,preSave is called - resetting all validations
      cSubmitAs: "PDF",
      cCharSet: "utf-8",
    });

    if (bSwitchACHEmails) {
      fDisplay(oACHDepositApproverSection, false);
    }

    fLog("back from email call");
  }

  // reset to showing all forms selected in tab 3 - but don't show requester or processor instructions
  //    fHide(oTab3ProcInstructions);

  fShowAllCommons();
  fShow(oCancelServicesTxtHeader); // text 'Services'

  fSetClientSegment(false);

  /* This is for case where we don't want user to be able to do anything other than save
    fHide(oTab3ProcInstructions);
    */

  // This is case where user can do whatever they want...
  fLog("Allowing user to edit and resend if interested...");
  fShow(oTabTab1);
  fShow(oTabTab2);
  fShow(oTab3ReqInstructions);
  fHide(oTab3ProcInstructions);

  // Sandwich read-only
  fLog("fDoMultiEMail - DONE");
}

function fDoACHDirectEmail(cDoc, bApproved) {
  var oForm = fGetField("Sect_ACHDirect", aTab2Forms);
  fFormMakeReadOnly(oForm);

  var aEmail = bApproved ? aToPDS : ""; // if not approved, user must enter email
  var aCC = bApproved ? "" : "cc=" + aToPDS;
  var aAppDec = bApproved ? msgApproved : msgDeclined;
  var aBody = bApproved ? msgACHApprovedBody : msgACHDeclinedBody;
  var aType =
    oACHDepositType.rawValue == 1 ? msgACHTypePrefunding : msgACHTypeTemporary;

  var aSubject =
    aAppDec +
    aType +
    " - " +
    geClientSRF.rawValue +
    "/" +
    geClientName.rawValue;
  var aUrl =
    "mailto:" + aEmail + "?" + aCC + "&subject=" + aSubject + "&body=" + aBody;

  fLog("EMAIL " + bApproved + " to " + aUrl);
  //Removed comment out for debugging 170922

  cDoc.submitForm({
    // mailForm fails security test for some reason...
    cURL: encodeURI(aUrl), // side effect is that the form is saved,i.e.,preSave is called - resetting all validations
    cSubmitAs: "PDF",
    cCharSet: "utf-8",
  });

  fLog("back from email call");
}


function bEmailinList(aEmail, vEmails) {
  for (var i = 0; i < vEmails.length; i++) {
    var aTestEmail = vEmails[i];
    if (aEmail == aTestEmail) return true;
  }
  return false;
}

function fDescribeavEmailForms() {
  fLog("fDescribeavEmailForms - " + countEmailsToSend());

  for (var aEmail in avEmailForms) {
    fLog("  eMail:" + aEmail);
    var vForms = avEmailForms[aEmail];
    fLog("  vForms:" + vForms); // remove later...
    for (var i = 0; i < vForms.length; i++) {
      var aForm = vForms[i];
      var aName = aForm["name"];
      var oForm = aForm["form"];
      fLog("      " + aName);
    }
  }
  fLog("fDescribeavEmailForms DONE");
}

// Collects forms by email routing
function countEmailsToSend() {
  c = 0;
  for (aEmail in avEmailForms) ++c;
  return c;
}
//function size_dict(d) { c = 0; for (i in d)++c; return c }
function addEmailForm(aEmail, formName, formObject) {
  aEmail = aEmail.toLowerCase(); // shouldn't be needed, but...

  // Special case1 - if form is 'EDI Payment Originator' it normally goes to corpecom@acme.com,
  // 1 - however if 'Bill Payment Remittance' is selected, then route to EDI Operations
  // 2 - if ' Payables Direct - XML' is selected, also add email to PSHOperations
  if (
    aEmail == "corpecom@acme.com" &&
    formName == "E-Commerce - Payment Originator"
  ) {
    var ePayOrigSvc = oEDIPaymentOriginator.sfSvcSelect.ddl.rawValue;
    if (ePayOrigSvc == 5) {
      // Bill Payment Remittance
      aEmail = "edioperations@acme.com";
      fLog("Special case substitution in effect");
    }
    if (ePayOrigSvc == 3) {
      // Payables Direct - XML
      aEmail += "; " + aToPHSOps;
      fLog("Special case addition of PSHOperations in effect");
    }
  }

  if (aEmail == "n/a") {
    fLog("addEmailForm - ROUTING ERROR - see N/A.   +" + formName);
    fLog("addEmailForm - formName=" + formName);
    aEmail = aToNA;
  }
  if (!(aEmail in avEmailForms))
    // create vector first time
    avEmailForms[aEmail] = [];
  var aForm = { name: formName, form: formObject };
  avEmailForms[aEmail].push(aForm);
}

function fSetClientSegmentTab1() {
  var iSegment = getRawElse(geClientType, 0) - 1;
  // Check each section / row of services
  for (i = 0; i < vaServices.length; i++) {
    var aServiceArea = vaServices[i];
    var vRows = aServiceArea["rows"];

    oTbl = aServiceArea.tbl;
    var vTblRows = fGetAllTableRows(oTbl.somExpression);

    var iCount = 0; // see if anything is in this section
    for (j = 0; j < vRows.length; j++) {
      var aRow = vRows[j];
      var vSegments = aRow.segments;
      var bOn = iSegment < 0 ? false : vSegments[iSegment] == 1; // if not selected nothing should show
      if (bOn) iCount++;

      var oTblRow = vTblRows.item(j);
      assert(oTblRow != null, "fSetClientSegment NULL: " + i + "/" + j);
      fHideShow(oTblRow, bOn);
    }
    fHideShow(aServiceArea.twistie, iCount > 0);
  }
}
// -Sets the right tab1 display
// -Shows the right forms for tab2/tab3, including commons subsections
// -Collects routing information for active forms
// -bTab2 - if going to tab 2 then we need to ensure things are fully setup
// returns true if any tab1 services are selected
function fSetClientSegment(bTab2) {
  //    fResetCommonArea();         // Turns off everything showing on tab 2 in the commons area
  var iSegment = getRawElse(geClientType, 0) - 1; // 0=CFS, 1=GBSC, 2=Private Banking
  var bAny = false; // figure out if anything is checked, return that
  bCommonRBCx = false; // any RBCx seen?   always seen in phase 1

  // Check each section / row of services
  for (i = 0; i < vaServices.length; i++) {
    // by section, then by rows in section
    var aServiceArea = vaServices[i];
    var vRows = aServiceArea["rows"];
    oTbl = aServiceArea.tbl;
    var vTblRows = fGetAllTableRows(oTbl.somExpression);

    for (j = 0; j < vRows.length; j++) {
      // running rows in table structure - same as rows in vaServices
      var aRow = vRows[j];
      var oTblRow = vTblRows.item(j);
      assert(oTblRow != null, "fSetClientSegment NULL: " + i + "/" + j);
      var bOn = fShowing(oTblRow); // Some don't show, depending on client segment - previously hidden (fSetClientSegmentTab1)
      var bChecked = bOn && aRow.static != 1 && oTblRow.sf.cb.rawValue == "1";
      bAny |= bChecked;

      fQkDisplay(aRow.form, bChecked); // shows/hides form in tab 2/3...

      // Finally, make r/w or r/o - and capture email routing
      if (bChecked) {
        if (i > 0) {
          // will do this to common sections later...
          if (bTab2) fFormMakeReadWrite(aRow.form);
          else fFormMakeReadOnly(aRow.form);
        }
      } // bChecked
    } // loop on j
  } // loop on i

  fHideShowRBCxSitesSection(bTab2);

  return bAny; // any check boxes checked?
}

// Build the dictionary
// Key: unique email address(es)
// Value: array of forms to be sent there
function fBuildEMailRouting() {
  var iSegment = fGetClientType();
  avEmailForms = {}; // reset global variable.    for some reason we setup all email addresses now...

  // 1. Product - note the only 'Special' at this point is SWIFT-Receive MT
  // 2. Common Address/ Cancel
  // 3. Common Contact level routing
  for (i = 0; i < vaServices.length; i++) {
    // by section, then by rows in section
    var aServiceArea = vaServices[i];
    var vRows = aServiceArea.rows;
    oTbl = aServiceArea.tbl;
    var vTblRows = fGetAllTableRows(oTbl.somExpression);

    for (j = 0; j < vRows.length; j++) {
      // running rows in table structure - same as rows in vaServices
      var aRow = vRows[j];
      var oTblRow = vTblRows.item(j);
      assert(oTblRow != null, "fSetClientSegment NULL: " + i + "/" + j);
      var bOn = fShowing(oTblRow); // Some don't show, depending on client segment - previously hidden (fSetClientSegmentTab1)
      var bChecked = bOn && aRow.static != 1 && fBool(oTblRow.sf.cb);
      if (bChecked) {
        switch (i) {
          case 0: // Common section
            for (var k = 0; k < vaCommonSvcs.length; k++) {
              // loop through each of the possible services...
              var aSvc = vaCommonSvcs[k];
              var oCB, vRouting, aEMail;
              switch (j) {
                case 0: // Common Address
                  oCB = oCommonCB(kaCommonAddressForm, k);
                  vRouting = aSvc.routing;
                  aEmail = vRouting[iSegment];
                  break;
                case 1: // Common Contact
                  oCB = oCommonCB(kaCommonContactForm, k);
                  vRouting = aSvc.contactRouting; // Different routing table than other two
                  aEmail = vRouting[iSegment];
                  break;
                case 2: // Common Cancel
                  oCB = oCommonCB(kaCommonCancelForm, k);
                  vRouting = aSvc.routing;
                  aEmail = vRouting[iSegment];
                  break;
              }
              if (fBool(oCB)) {
                var aFormName =
                  (bEN ? aRow.name : aRow.frname) + " (" + aSvc.name + ")"; // Address Change (Account Images)
                addEmailForm(aEmail, aFormName, aRow.form); // specific name, but shared common contact form
              }
            }
            break;
          case 3: // Payment Products
            if (j == 8) {
              // Receive MT101 and Other Services
              /* Update 171221
                                Receive MT101 (Does Not Have BIC): Will go to CSFI
                                Receive MT101 (Have BIC): Will go to DMC
                             */
              fLog("Special Case SWIFT");
              var oForm = aRow.form;
              oForm = oForm.Content; // added a layer 11/14/17

              var oBIC = oForm.sfTreeTop.rbHaveBIC;
              assert(oBIC != null, "fSpecialCaseSWIFT - need BIC rb");
              var bHasBIC = fBool(oBIC);
              fLog("bHasBIC:" + bHasBIC);
              if (bHasBIC)
                addEmailForm(
                  aToBESSData,
                  bEN ? aRow.name : aRow.frname,
                  aRow.form
                );
              else
                addEmailForm(aToCSFI, bEN ? aRow.name : aRow.frname, aRow.form);
              break;
            } // else falls through to default

          default:
            // Products
            var vRouting = aRow.routing;
            if (typeof vRouting == "undefined") {
              fLog("undefined here - aRow=" + aRow);
            }
            aEmail = vRouting[iSegment];
            addEmailForm(aEmail, bEN ? aRow.name : aRow.frname, aRow.form);
            break;
        }
      }
    }
  }
}

function fHideShowRBCxSitesSection(bTab2) {
  var bActive = false;
  var oFrmAddr = oCommonForm(kaCommonAddressForm);
  if (fShowing(oFrmAddr))
    bActive |= oCommonCB(kaCommonAddressForm, 0).rawValue == "1";

  var oFrmCntt = oCommonForm(kaCommonContactForm);
  if (fShowing(oFrmCntt))
    bActive |= oCommonCB(kaCommonContactForm, 0).rawValue == "1";

  var oFrmCncl = oCommonForm(kaCommonCancelForm);
  if (fShowing(oFrmCncl))
    bActive |= oCommonCB(kaCommonCancelForm, 0).rawValue == "1";

  // Now check if any of the other RBCx forms are selected
  oRBCx = vaServices[1];
  vRows = oRBCx.rows;
  for (i = 0; i < vRows.length; i++) {
    oSect = vRows[i];
    oForm = oSect.form;
    bActive |= fShowing(oForm);
    if (bActive) break;
  }

  fDisplay(oTab2RBCx, bActive && bTab2);
  fDisplay(oTab3RBCx, bActive && !bTab2);
}

function fFinallyShowInsideCommons(bTab2) {
  // Call things appropriately if commons active and RBCx checked
  if (fShowing(oCommSectAddress))
    // && ( oCommonCB(kaCommonAddressForm,0).rawValue == '1'
    fAddressInfoShows(bTab2);
  if (fShowing(oCommmSectContact))
    // && ( oCommonCB(kaCommonContactForm,0).rawValue == '1' )
    fContactInfoShows(bTab2);
  if (fShowing(oCommmSectCancel))
    // && ( oCommonCB(kaCommonCancelForm,0).rawValue == '1' )
    fCancelInfoShows(bTab2);
}

function fInitServiceDescription() {
  // validate table is properly constructed,i.e.,no empty keys
  for (i = 0; i < vaServices.length; i++) {
    var aServiceArea = vaServices[i];
    assert(
      "name" in aServiceArea,
      "missing key name in service " + aServiceArea
    );
    var aSvcName = aServiceArea["name"];
    assert("tbl" in aServiceArea, "missing key tbl in service " + aSvcName);
    assert(
      "twistie" in aServiceArea,
      "missing key twistie in service " + aSvcName
    );
    assert("rows" in aServiceArea, "missing key rows in service " + aSvcName);

    var vRows = aServiceArea["rows"];
    for (j = 0; j < vRows.length; j++) {
      var aRow = vRows[j];
      assert("name" in aRow, "missing key segments in service " + aSvcName);
      var aRowName = aRow["name"];
      assert("segments" in aRow, "missing key segments in service " + aRowName);
      assert("static" in aRow, "missing key static in service " + aRowName);
      assert("form" in aRow, "missing key form in service " + aRowName);
      assert(aRow["form"] != null, "form is null in service " + aRowName);
    }
  }

  // Fill in the cb field for each row,i.e.,get the checkbox object
  for (i = 0; i < vaServices.length; i++) {
    var aServiceArea = vaServices[i];
    var vRows = aServiceArea["rows"];
    oTbl = aServiceArea["tbl"];
    var aSOM = oTbl.somExpression;
    for (j = 0; j < vRows.length; j++) {
      var aRow = vRows[j];
      bStatic = aRow["static"] == 1;
      if (!bStatic) {
        aSOMCB = aSOM + ".Row[" + j + "].sf.cb";
        var oCB = resolveNode(aSOMCB);
        assert(
          oCB != null,
          "missing cb in service " + aRow["name"] + " at " + aSOMCB
        );
        aRow["cb"] = oCB;
      }
    }
  }
}

/**************************/
/***** Business Logic *****/
/**************************/

// Called with either new tab (0,1,2) or -1 meaning reset as email just sent
function fTabSwitchSetInfo(iToTab) {
  // called at initialization and every tab switch
  fLog("fTabSwitchSetInfo: " + iToTab);
  var bTab1 = iToTab <= 0; // tab 1 or initializing
  var bTab2 = iToTab == 1;
  var bTab3 = iToTab == 2;

  if (bTab2 || bTab3) {
    var bAnythingSelected = fSetClientSegment(iToTab == 1); // hide/shows all forms called for, including RBCx site

    fQkDisplay(oTab2NoneSelected, !bAnythingSelected); // 'Please go back to tab one and select one or more services...
    fQkDisplay(oTab2OnToNext, bTab2 && bAnythingSelected);
    fHide(oTab2Processing);
    fQkDisplay(oTab2Requestor, bTab3 && bAnythingSelected);
    fQkDisplay(oTab2Overview, bTab3 && bAnythingSelected);

    if (bAnythingSelected) {
      // one or more forms active
      fCopyGlobalsT1T3();
    }

    // other business logic for tabs 2 or 3

  }

  if (bTab3) {
    // want to set the 'one' or 'multiple' emails button
    fBuildEMailRouting();
    var iEmails = countEmailsToSend();
    fLog("emails to send=" + iEmails);
    if (iEmails == 0) {
      // Special CEPAS and it's the only form
      oTab3btnSubmit.caption.value.text = msgSendEmail; // msgDisplayEMNotice;
    } else if (iEmails == 1) {
      oTab3btnSubmit.caption.value.text = msgSendEmail;
    } else {
      oTab3btnSubmit.caption.value.text =
        msgSendEmailS1 + iEmails + msgSendEmailS2;
    }
    fFormMakeReadOnly(oTab2Forms);
  } else {
    fFormMakeReadWrite(oTab2Forms);
  }
}

function fClickToTab(iTab) {
  // switch tabs
  var aTabField = "form1.FirstPage.aTabStrip.aTab[" + iTab + "].aButton";
  var oTabButton = xfa.resolveNodes(aTabField);
  oTabButton = oTabButton.item(0);
  fClickaTab(oTabButton);
}

function fCopyGlobalsT1T3() {   // Copy global fields
  fStartReadingGlobals();       // clears out global area
  fReadGlobals(oTab1Fields);    // read tab one
  fWriteGlobals(oTab2Forms);    // write to tab 2/3
}

function fPrepTab3() {
  fLog("t.b.d. - fPrepTab3");
  //    fPrepMultiEMail();
}

function fHideAllTab3Sections() {
  fLog("t.b.d. - fHideAllTab3Sections");
  /*
    for (var i=0; i < vaForms.length; i++) {
        var aForm=vaForms[i];
        var oFrm=voTab2[aForm];
        fHide(oFrm);
    }
    */
}

/********************************************************/
/***** Validation, Helpers, Utilities *******************/
/********************************************************/

// JSON is not available - store as pairs of strings
function stringify(jVal) {
  var a = "";
  for (aKey in jVal) {
    var aVal = jVal[aKey];
    a += aKey + "," + aVal + ",";
  }
  return a.substr(0, a.length - 1);
}

function destringify(aVal) {
  var vA = aVal.split(",");
  for (var i = 0; i < vA.length; i += 2) {
    var aKey = vA[i];
    var aVal = vA[i + 1];
    vaFldTest[aKey] = aVal;
  }
}

// Table helper functions
function fGetAllTableRows(aTableSOM) {
  var vList = xfa.resolveNodes(aTableSOM + ".Row[*]");
  return vList;
}

// WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW
function fixTable(oTable) {   // Accessibility
  fLog("fixTable removed - "+oTable.somExpression);
  return;

  var oRows = fGetAllTableRows(oTable.somExpression);
  for (var i = 0; i < oRows.length; i++) {
    // loop through rows
    var oButton = oRows.item(i).btnRemove;
    oButton.assist.toolTip.value = msgRemoveRow + (i + 1);
  }

  if (oRows.length > 1) {
    fLog("calling fMakeNewRowValidate");
    fMakeNewRowValidate(oRows.item(0), oRows.item(oRows.length - 1));
    //fLog("back from fMakeNewRowValidate");
  }
}
// WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW


// Adding a row to a table:
// - add the row - not there is confusion as to this screwing the base variable up?
// - fix table for accessibility - assumes consistent naming of 'Remove' button
// - add all new fields on the new row to the validation table
function fAddARow(oTable) {
  aTableSOM = oTable.somExpression;   // addInstance can screw things up... ???
  oTable.Row.instanceManager.addInstance();

  var oRows = fGetAllTableRows(aTableSOM);
  for (var i = 0; i < oRows.length; i++) {  // loop through rows
    var oButton = oRows.item(i).btnRemove;
    oButton.assist.toolTip.value = msgRemoveRow + (i + 1);
  }

  // Need to get the default validation for each element in Row 0 and make it so for this new row
  var oBaseRow = oRows.item(0);
  var oNewRow = oRows.item(oRows.length - 1);
  fMakeNewRowValidate(oBaseRow, oNewRow);
  splitOutBigString(stringify(vaFldTest)); // and save for next time
}

// Other field nice-ty functions
function fPadToFive(number) {
  // for transit numbers
  if (!number.isNull) {
    var value = number.rawValue;
    if (value <= 99999) {
      value = ("0000" + value).slice(-5);
      number.rawValue = value;
    }
  }
}

function fPadToTwo(number) {
  if (!number.isNull) {
    var value = number.rawValue;
    if (value <= 99) {
      value = ("0" + value).slice(-2);
      number.rawValue = value;
    }
  }
}

function fFldStringEmpty(o) {
  if (o.isNull) return true; // ???
  if (o.rawValue.isNull) return true;
  if (typeof o.rawValue === "number") return false;
  if (typeof o.rawValue === "string") {
    var a = o.rawValue;
    if (a.length > 0) {
      a = fTrim(a); // whitespace trim
    }
    return a.length <= 0;
  }
  return false; // not null - not string - ???
}

function fFldString2Chars(o) {
  if (o.isNull) return true; // ???
  if (o.rawValue.isNull) return true;
  if (typeof o.rawValue === "number") return false;
  if (typeof o.rawValue === "string") {
    var a = o.rawValue;
    if (a.length > 0) {
      a = fTrim(a); // a=a.replace(/^\s+|\s+$/g,'');      // whitespace trim
    }
    return a.length >= 2;
  }
  return false; // not null - not string - ???
}

// Need definition for 'special characters' - these can be stripped
function fFldMinMaxAnyChars(o, minChars, maxChars) {
  if (o.isNull) return true; // ???
  if (o.rawValue.isNull) return true;
  if (typeof o.rawValue === "number") return false;
  if (typeof o.rawValue === "string") {
    var a = o.rawValue;
    if (a.length > 0) {
      a = fTrim(a); // a=a.replace(/^\s+|\s+$/g,'');      // whitespace trim
      o.rawValue = a; // just in case
    }
    return a.length >= minChars && a.length <= maxChars;
  }
  return false; // not null - not string - ???
}

function fBool(o) {
  return o.rawValue == "1";
}
function fTrim(a) {
  if (a == null) return "";
  return a.replace(/^\s+|\s+$/g, "");
}
function fTrimField(o) {
  if (o.isNull) return;
  o.rawValue = fTrim(o.rawValue);
}
function fFormatDate(oDate) {
  var iMonth = oDate.getMonth() + 1;
  var iDay = oDate.getDate();
  var iYear = oDate.getFullYear();
  return iYear + "-" + fEnsure2Digits(iMonth) + "-" + fEnsure2Digits(iDay);
}
function fFormatTime(oDate) {
  var iHH = oDate.getHours();
  var iMM = oDate.getMinutes();
  return fEnsure2Digits(iHH) + fEnsure2Digits(iMM);
}

function getRawElse(o, elseVal) {
  assert(o != null, "getRawElse saw null for object");
  if (o.isNull) return elseVal;
  if (o.rawValue == null) return elseVal;
  if (o.rawValue.isNull) return elseVal;
  return o.rawValue;
}

function fSetNullTestTo(o, bDisabled) {
  var aNull = bDisabled ? "disabled" : "error";
  if (o.validate.nullTest == aNull) return;
  o.validate.nullTest = aNull;
  fSaveNodeAttr(o); // and save over tab switches
}

function fSetFormatTestTo(o, bDisabled) {
  var aNull = bDisabled ? "disabled" : "error";
  if (o.validate.formatTest == aNull) return;
  2;
  o.validate.formatTest = aNull;
  fSaveNodeAttr(o); // and save over tab switches
}

function Date2Num(adt, fmt) {
  // assume format is YYYY-MM-DD
  aYr = adt.substring(0, 4);
  aMn = adt.substring(5, 7);
  aDt = adt.substring(8, 10);

  iYr = parseInt(aYr);
  iMn = parseInt(aMn);
  iDt = parseInt(aDt);

  // var d = new Date(2011,10,30);   months should be minus 1
  oDate = new Date(iYr, iMn - 1, iDt);
  return oDate;
}


function add_business_days(days) {
  // https://www.sitepoint.com/community/t/add-days-to-date-while-ignoring-weekends-and-holidays-possible/3827
  var now = new Date();
  var dayOfTheWeek = now.getDay();
  var calendarDays = days;
  var deliveryDay = dayOfTheWeek + days;
  if (deliveryDay >= 6) {
    //deduct this-week days
    days -= 6 - dayOfTheWeek;
    //count this coming weekend
    calendarDays += 2;
    //how many whole weeks?
    deliveryWeeks = Math.floor(days / 5);
    //two days per weekend per week
    calendarDays += deliveryWeeks * 2;
  }
  now.setTime(now.getTime() + calendarDays * 24 * 60 * 60 * 1000);

  return now;
}

// date must be daysInFuture
function fValidDate(oDate, daysInFuture) {
  //fLog("fValidDate");
  if (oDate.rawValue == null) return true;

  var parts = oDate.rawValue.split("-");
  // Please pay attention to the month (parts[1]); JavaScript counts months from 0:
  // January - 0, February - 1, etc.
  var oDt = new Date(parts[0], parts[1] - 1, parts[2]);

  var o2Days = add_business_days(2);
  o2Days.setHours(0, 0, 0, 0);
  fLog("dates: " + o2Days + ", " + oDt + "   --> compare=" + (o2Days <= oDt));

  return o2Days <= oDt;
}

function fDateBefore(oDate1, oDate2) {
  if (oDate1.rawValue == null || oDate2.rawValue == null) return true;

  var oDt1 = Date2Num(oDate1.rawValue, "YYYY-MM-DD");
  var oDt2 = Date2Num(oDate2.rawValue, "YYYY-MM-DD");

  // Take the difference between the dates and divide by milliseconds per day.
  // Round to nearest whole number to deal with DST.
  iDiff = Math.round((oDt2 - oDt1) / (1000 * 60 * 60 * 24));

  //    fLog("days different="+iDiff);

  return iDiff >= 0 && iDiff < 45; // 4/28/19 - changed to >=
}

function fPhone(oPhone, oIntl) {
  if (fFldStringEmpty(oPhone)) return true;
  if (oIntl.rawValue == 1) {
    return true; // other country
  }
  return fPhoneNo(oPhone);
}

var phonePatt = new RegExp(
  "^(?:\\+?(\\d{1,3}))?[-. (]*(\\d{3})[-. )]*(\\d{3})[-. ]*(\\d{4})(?: *x(\\d+))?$"
);
function fPhoneNo(oPhone) {
  if (fFldStringEmpty(oPhone)) return true;
  // http://stackoverflow.com/questions/16699007/regular-expression-to-match-standard-10-digit-phone-number
  if (typeof oPhone.rawValue === "string") {
    var result = phonePatt.test(fTrim(oPhone.rawValue));
    return result;
  }
  return false;
}

var phoneExtPatt = new RegExp("^[0-9]+$"); // ^\s*[0-9]+\s*$
function fPhoneExtNo(oExt) {
  if (fFldStringEmpty(oExt)) return true;
  // http://stackoverflow.com/questions/16699007/regular-expression-to-match-standard-10-digit-phone-number
  if (typeof oExt.rawValue === "string") {
    var result = phoneExtPatt.test(fTrim(oExt.rawValue));
    return result;
  }
  return false;
}

function fValidBasedOnCountry(oCountry, oOtherCountry, oCity, oState, oZip) {
  cLookFeel.fDisplay(oOtherCountry, oCountry.rawValue == 3);

  fSetNullTestTo(oCity, oCountry.rawValue == 3); // USA and Canada require city,state,postal/zip
  fSetNullTestTo(oState, oCountry.rawValue == 3);
  fSetNullTestTo(oZip, oCountry.rawValue == 3);
}

function fAcctNumberMaxValid(oMin, oMax) {
  if (fFldStringEmpty(oMin)) return true;
  if (fFldStringEmpty(oMax)) return true;
  iMin = oMin.rawValue;
  iMax = oMax.rawValue;
  //fLog("fAcctNumberMaxValid - min:"+iMin+", max:"+iMax);
  if (iMax < 0) return false;
  if (iMax > 30) return false;
  if (iMin > iMax) return false;
  return true;
}

function fAcctNumberMinValid(oMin, oMax) {
  if (fFldStringEmpty(oMin)) return true;
  if (fFldStringEmpty(oMax)) return true;
  iMin = oMin.rawValue;
  iMax = oMax.rawValue;
  //fLog("fAcctNumberMinValid - min:"+iMin+", max:"+iMax);
  if (iMin < 0) return false;
  if (iMin > 30) return false;
  if (iMin > iMax) return false;
  return true;
}

var emailPatt = new RegExp(
  "^[a-zA-Z0-9_\\-\\.]+\\@[a-zA-Z0-9_\\-\\.]+\\.[a-zA-Z]{2,8}$"
); // (allows 2-8 characters in domain suffix)
function fEMail(o) {
  if (fFldStringEmpty(o)) return true;
  if (typeof o.rawValue === "string") {
    // Set the regular expression to look for an email address in general form
    // Test the rawValue of the current object to see if it fits the general form of an email address
    var result = emailPatt.test(fTrim(o.rawValue));
    return result;
  }
  return false;
}

// No free emails
var freeEmailPatt = new RegExp("yahoo.com|hotmail.com|gmail.com|aol.com");
function fEMailCorp(o) {
  if (!fEMail(o)) return false;
  var result = freeEmailPatt.test(fTrim(o.rawValue));
  return !result;
}

function fValidPostalZip(oTxt, oCntry) {
  if (fFldStringEmpty(oTxt)) return true; // empty field caught by 'required'
  if (oCntry.rawValue == 1) {
    return fPostalCode(oTxt);
  } else if (oCntry.rawValue == 2) {
    return fZipCode(oTxt);
  }
  return true; // anything allowed for other countries
}
var zipPatt = new RegExp("^[0-9]{5}(?:-[0-9]{4})?$");
function fZipCode(o) {
  if (fFldStringEmpty(o)) return true;
  if (typeof o.rawValue === "string") {
    return zipPatt.test(fTrim(o.rawValue));
  }
  return false;
}
var pcPatt = new RegExp("^\\w\\d\\w\\s?\\d\\w\\d$");
function fPostalCode(o) {
  if (fFldStringEmpty(o)) return true;
  if (typeof o.rawValue === "string") {
    return pcPatt.test(fTrim(o.rawValue));
  }
  return false;
}

// either blank or any number of characters up to 8 (controlled by max length
// first char must be '9'
function fFldCCIN(o) {
  if (fFldStringEmpty(o)) return true;
  var a = o.rawValue;
  return a[0] == "9";
}

// 'SRF' is the name for the customer id for a bank
// 9 digits and satisfies mod10
function fFldSRF(o) {
  if (fFldStringEmpty(o)) return true;
  if (!fNDigits(o, 9)) return false;
  return fMod10(o);
}
function fMod10(field) {
  // Used for SRF
  if (!field.isNull && fNumericValidate(field)) {
    var number = field.rawValue;
    //double every other character starting with 2nd from the right and going left
    //put into array doubled[]
    var doubled = [];
    for (var i = number.length - 2; i >= 0; i = i - 2) {
      doubled.push(2 * number[i]);
    }
    //add up the non-doubled characters
    var total = 0;
    for (var i = number.length % 2 == 0 ? 1 : 0; i < number.length; i = i + 2) {
      total += parseInt(number[i]);
    }
    //add up each character in doubled[]
    for (var i = 0; i < doubled.length; i++) {
      var num = doubled[i];
      var digit;
      while (num != 0) {
        digit = num % 10;
        num = parseInt(num / 10);
        total += digit;
      }
    }
    //mod 10 check
    if (total % 10 == 0) {
      return true;
    } else {
      return false;
    }
  }
  return true;
}

function fAllDigits(o) {
  if (fFldStringEmpty(o)) return true;
  if (typeof o.rawValue === "number") return true;
  if (typeof o.rawValue === "string") {
    return o.rawValue.match("\\d+") == o.rawValue;
  }
  return false;
}
function fNDigits(o, digits) {
  if (fFldStringEmpty(o)) return true;
  if (!fAllDigits(o)) return false;
  if (typeof o.rawValue === "number") {
    app.alert("whoops - fNDigits- what if leading zeros?");
    var a = o.rawValue.toString();
    return a.length == digits; // what about leading zeros???
  }
  return o.rawValue.length == digits;
}
function fNumericValidate(number) {
  if (!number.isNull) {
    var value = number.rawValue;
    var regExp = /^\d*$/;
    if (regExp.test(value)) {
      return true;
    }
    return false;
  }
  return true;
}
function fNumLessThan(o, amt) {
  if (fFldStringEmpty(o)) return true;
  // Decimal type - always number
  return Number(o.rawValue) <= amt;
}


/***** Removal of Diacritical characters from a string - required for url...  *****/
var defaultDiacriticsRemovalMap = [
  {
    base: "A",
    letters:
      "\u0041\u24B6\uFF21\u00C0\u00C1\u00C2\u1EA6\u1EA4\u1EAA\u1EA8\u00C3\u0100\u0102\u1EB0\u1EAE\u1EB4\u1EB2\u0226\u01E0\u00C4\u01DE\u1EA2\u00C5\u01FA\u01CD\u0200\u0202\u1EA0\u1EAC\u1EB6\u1E00\u0104\u023A\u2C6F",
  },
  { base: "AA", letters: "\uA732" },
  { base: "AE", letters: "\u00C6\u01FC\u01E2" },
  { base: "AO", letters: "\uA734" },
  { base: "AU", letters: "\uA736" },
  { base: "AV", letters: "\uA738\uA73A" },
  { base: "AY", letters: "\uA73C" },
  {
    base: "B",
    letters: "\u0042\u24B7\uFF22\u1E02\u1E04\u1E06\u0243\u0182\u0181",
  },
  {
    base: "C",
    letters:
      "\u0043\u24B8\uFF23\u0106\u0108\u010A\u010C\u00C7\u1E08\u0187\u023B\uA73E",
  },
  {
    base: "D",
    letters:
      "\u0044\u24B9\uFF24\u1E0A\u010E\u1E0C\u1E10\u1E12\u1E0E\u0110\u018B\u018A\u0189\uA779\u00D0",
  },
  { base: "DZ", letters: "\u01F1\u01C4" },
  { base: "Dz", letters: "\u01F2\u01C5" },
  {
    base: "E",
    letters:
      "\u0045\u24BA\uFF25\u00C8\u00C9\u00CA\u1EC0\u1EBE\u1EC4\u1EC2\u1EBC\u0112\u1E14\u1E16\u0114\u0116\u00CB\u1EBA\u011A\u0204\u0206\u1EB8\u1EC6\u0228\u1E1C\u0118\u1E18\u1E1A\u0190\u018E",
  },
  { base: "F", letters: "\u0046\u24BB\uFF26\u1E1E\u0191\uA77B" },
  {
    base: "G",
    letters:
      "\u0047\u24BC\uFF27\u01F4\u011C\u1E20\u011E\u0120\u01E6\u0122\u01E4\u0193\uA7A0\uA77D\uA77E",
  },
  {
    base: "H",
    letters:
      "\u0048\u24BD\uFF28\u0124\u1E22\u1E26\u021E\u1E24\u1E28\u1E2A\u0126\u2C67\u2C75\uA78D",
  },
  {
    base: "I",
    letters:
      "\u0049\u24BE\uFF29\u00CC\u00CD\u00CE\u0128\u012A\u012C\u0130\u00CF\u1E2E\u1EC8\u01CF\u0208\u020A\u1ECA\u012E\u1E2C\u0197",
  },
  { base: "J", letters: "\u004A\u24BF\uFF2A\u0134\u0248" },
  {
    base: "K",
    letters:
      "\u004B\u24C0\uFF2B\u1E30\u01E8\u1E32\u0136\u1E34\u0198\u2C69\uA740\uA742\uA744\uA7A2",
  },
  {
    base: "L",
    letters:
      "\u004C\u24C1\uFF2C\u013F\u0139\u013D\u1E36\u1E38\u013B\u1E3C\u1E3A\u0141\u023D\u2C62\u2C60\uA748\uA746\uA780",
  },
  { base: "LJ", letters: "\u01C7" },
  { base: "Lj", letters: "\u01C8" },
  { base: "M", letters: "\u004D\u24C2\uFF2D\u1E3E\u1E40\u1E42\u2C6E\u019C" },
  {
    base: "N",
    letters:
      "\u004E\u24C3\uFF2E\u01F8\u0143\u00D1\u1E44\u0147\u1E46\u0145\u1E4A\u1E48\u0220\u019D\uA790\uA7A4",
  },
  { base: "NJ", letters: "\u01CA" },
  { base: "Nj", letters: "\u01CB" },
  {
    base: "O",
    letters:
      "\u004F\u24C4\uFF2F\u00D2\u00D3\u00D4\u1ED2\u1ED0\u1ED6\u1ED4\u00D5\u1E4C\u022C\u1E4E\u014C\u1E50\u1E52\u014E\u022E\u0230\u00D6\u022A\u1ECE\u0150\u01D1\u020C\u020E\u01A0\u1EDC\u1EDA\u1EE0\u1EDE\u1EE2\u1ECC\u1ED8\u01EA\u01EC\u00D8\u01FE\u0186\u019F\uA74A\uA74C",
  },
  { base: "OI", letters: "\u01A2" },
  { base: "OO", letters: "\uA74E" },
  { base: "OU", letters: "\u0222" },
  { base: "OE", letters: "\u008C\u0152" },
  { base: "oe", letters: "\u009C\u0153" },
  {
    base: "P",
    letters: "\u0050\u24C5\uFF30\u1E54\u1E56\u01A4\u2C63\uA750\uA752\uA754",
  },
  { base: "Q", letters: "\u0051\u24C6\uFF31\uA756\uA758\u024A" },
  {
    base: "R",
    letters:
      "\u0052\u24C7\uFF32\u0154\u1E58\u0158\u0210\u0212\u1E5A\u1E5C\u0156\u1E5E\u024C\u2C64\uA75A\uA7A6\uA782",
  },
  {
    base: "S",
    letters:
      "\u0053\u24C8\uFF33\u1E9E\u015A\u1E64\u015C\u1E60\u0160\u1E66\u1E62\u1E68\u0218\u015E\u2C7E\uA7A8\uA784",
  },
  {
    base: "T",
    letters:
      "\u0054\u24C9\uFF34\u1E6A\u0164\u1E6C\u021A\u0162\u1E70\u1E6E\u0166\u01AC\u01AE\u023E\uA786",
  },
  { base: "TZ", letters: "\uA728" },
  {
    base: "U",
    letters:
      "\u0055\u24CA\uFF35\u00D9\u00DA\u00DB\u0168\u1E78\u016A\u1E7A\u016C\u00DC\u01DB\u01D7\u01D5\u01D9\u1EE6\u016E\u0170\u01D3\u0214\u0216\u01AF\u1EEA\u1EE8\u1EEE\u1EEC\u1EF0\u1EE4\u1E72\u0172\u1E76\u1E74\u0244",
  },
  { base: "V", letters: "\u0056\u24CB\uFF36\u1E7C\u1E7E\u01B2\uA75E\u0245" },
  { base: "VY", letters: "\uA760" },
  {
    base: "W",
    letters: "\u0057\u24CC\uFF37\u1E80\u1E82\u0174\u1E86\u1E84\u1E88\u2C72",
  },
  { base: "X", letters: "\u0058\u24CD\uFF38\u1E8A\u1E8C" },
  {
    base: "Y",
    letters:
      "\u0059\u24CE\uFF39\u1EF2\u00DD\u0176\u1EF8\u0232\u1E8E\u0178\u1EF6\u1EF4\u01B3\u024E\u1EFE",
  },
  {
    base: "Z",
    letters:
      "\u005A\u24CF\uFF3A\u0179\u1E90\u017B\u017D\u1E92\u1E94\u01B5\u0224\u2C7F\u2C6B\uA762",
  },
  {
    base: "a",
    letters:
      "\u0061\u24D0\uFF41\u1E9A\u00E0\u00E1\u00E2\u1EA7\u1EA5\u1EAB\u1EA9\u00E3\u0101\u0103\u1EB1\u1EAF\u1EB5\u1EB3\u0227\u01E1\u00E4\u01DF\u1EA3\u00E5\u01FB\u01CE\u0201\u0203\u1EA1\u1EAD\u1EB7\u1E01\u0105\u2C65\u0250",
  },
  { base: "aa", letters: "\uA733" },
  { base: "ae", letters: "\u00E6\u01FD\u01E3" },
  { base: "ao", letters: "\uA735" },
  { base: "au", letters: "\uA737" },
  { base: "av", letters: "\uA739\uA73B" },
  { base: "ay", letters: "\uA73D" },
  {
    base: "b",
    letters: "\u0062\u24D1\uFF42\u1E03\u1E05\u1E07\u0180\u0183\u0253",
  },
  {
    base: "c",
    letters:
      "\u0063\u24D2\uFF43\u0107\u0109\u010B\u010D\u00E7\u1E09\u0188\u023C\uA73F\u2184",
  },
  {
    base: "d",
    letters:
      "\u0064\u24D3\uFF44\u1E0B\u010F\u1E0D\u1E11\u1E13\u1E0F\u0111\u018C\u0256\u0257\uA77A",
  },
  { base: "dz", letters: "\u01F3\u01C6" },
  {
    base: "e",
    letters:
      "\u0065\u24D4\uFF45\u00E8\u00E9\u00EA\u1EC1\u1EBF\u1EC5\u1EC3\u1EBD\u0113\u1E15\u1E17\u0115\u0117\u00EB\u1EBB\u011B\u0205\u0207\u1EB9\u1EC7\u0229\u1E1D\u0119\u1E19\u1E1B\u0247\u025B\u01DD",
  },
  { base: "f", letters: "\u0066\u24D5\uFF46\u1E1F\u0192\uA77C" },
  {
    base: "g",
    letters:
      "\u0067\u24D6\uFF47\u01F5\u011D\u1E21\u011F\u0121\u01E7\u0123\u01E5\u0260\uA7A1\u1D79\uA77F",
  },
  {
    base: "h",
    letters:
      "\u0068\u24D7\uFF48\u0125\u1E23\u1E27\u021F\u1E25\u1E29\u1E2B\u1E96\u0127\u2C68\u2C76\u0265",
  },
  { base: "hv", letters: "\u0195" },
  {
    base: "i",
    letters:
      "\u0069\u24D8\uFF49\u00EC\u00ED\u00EE\u0129\u012B\u012D\u00EF\u1E2F\u1EC9\u01D0\u0209\u020B\u1ECB\u012F\u1E2D\u0268\u0131",
  },
  { base: "j", letters: "\u006A\u24D9\uFF4A\u0135\u01F0\u0249" },
  {
    base: "k",
    letters:
      "\u006B\u24DA\uFF4B\u1E31\u01E9\u1E33\u0137\u1E35\u0199\u2C6A\uA741\uA743\uA745\uA7A3",
  },
  {
    base: "l",
    letters:
      "\u006C\u24DB\uFF4C\u0140\u013A\u013E\u1E37\u1E39\u013C\u1E3D\u1E3B\u017F\u0142\u019A\u026B\u2C61\uA749\uA781\uA747",
  },
  { base: "lj", letters: "\u01C9" },
  { base: "m", letters: "\u006D\u24DC\uFF4D\u1E3F\u1E41\u1E43\u0271\u026F" },
  {
    base: "n",
    letters:
      "\u006E\u24DD\uFF4E\u01F9\u0144\u00F1\u1E45\u0148\u1E47\u0146\u1E4B\u1E49\u019E\u0272\u0149\uA791\uA7A5",
  },
  { base: "nj", letters: "\u01CC" },
  {
    base: "o",
    letters:
      "\u006F\u24DE\uFF4F\u00F2\u00F3\u00F4\u1ED3\u1ED1\u1ED7\u1ED5\u00F5\u1E4D\u022D\u1E4F\u014D\u1E51\u1E53\u014F\u022F\u0231\u00F6\u022B\u1ECF\u0151\u01D2\u020D\u020F\u01A1\u1EDD\u1EDB\u1EE1\u1EDF\u1EE3\u1ECD\u1ED9\u01EB\u01ED\u00F8\u01FF\u0254\uA74B\uA74D\u0275",
  },
  { base: "oi", letters: "\u01A3" },
  { base: "ou", letters: "\u0223" },
  { base: "oo", letters: "\uA74F" },
  {
    base: "p",
    letters: "\u0070\u24DF\uFF50\u1E55\u1E57\u01A5\u1D7D\uA751\uA753\uA755",
  },
  { base: "q", letters: "\u0071\u24E0\uFF51\u024B\uA757\uA759" },
  {
    base: "r",
    letters:
      "\u0072\u24E1\uFF52\u0155\u1E59\u0159\u0211\u0213\u1E5B\u1E5D\u0157\u1E5F\u024D\u027D\uA75B\uA7A7\uA783",
  },
  {
    base: "s",
    letters:
      "\u0073\u24E2\uFF53\u00DF\u015B\u1E65\u015D\u1E61\u0161\u1E67\u1E63\u1E69\u0219\u015F\u023F\uA7A9\uA785\u1E9B",
  },
  {
    base: "t",
    letters:
      "\u0074\u24E3\uFF54\u1E6B\u1E97\u0165\u1E6D\u021B\u0163\u1E71\u1E6F\u0167\u01AD\u0288\u2C66\uA787",
  },
  { base: "tz", letters: "\uA729" },
  {
    base: "u",
    letters:
      "\u0075\u24E4\uFF55\u00F9\u00FA\u00FB\u0169\u1E79\u016B\u1E7B\u016D\u00FC\u01DC\u01D8\u01D6\u01DA\u1EE7\u016F\u0171\u01D4\u0215\u0217\u01B0\u1EEB\u1EE9\u1EEF\u1EED\u1EF1\u1EE5\u1E73\u0173\u1E77\u1E75\u0289",
  },
  { base: "v", letters: "\u0076\u24E5\uFF56\u1E7D\u1E7F\u028B\uA75F\u028C" },
  { base: "vy", letters: "\uA761" },
  {
    base: "w",
    letters:
      "\u0077\u24E6\uFF57\u1E81\u1E83\u0175\u1E87\u1E85\u1E98\u1E89\u2C73",
  },
  { base: "x", letters: "\u0078\u24E7\uFF58\u1E8B\u1E8D" },
  {
    base: "y",
    letters:
      "\u0079\u24E8\uFF59\u1EF3\u00FD\u0177\u1EF9\u0233\u1E8F\u00FF\u1EF7\u1E99\u1EF5\u01B4\u024F\u1EFF",
  },
  {
    base: "z",
    letters:
      "\u007A\u24E9\uFF5A\u017A\u1E91\u017C\u017E\u1E93\u1E95\u01B6\u0225\u0240\u2C6C\uA763",
  },
];

var diacriticsMap = {};
for (var i = 0; i < defaultDiacriticsRemovalMap.length; i++) {
  var letters = defaultDiacriticsRemovalMap[i].letters;
  for (var j = 0; j < letters.length; j++) {
    diacriticsMap[letters[j]] = defaultDiacriticsRemovalMap[i].base;
  }
}

// "what?" version ... http://jsperf.com/diacritics/12
function removeDiacritics(str) {
  return str.replace(/[^\u0000-\u007E]/g, function (a) {
    return diacriticsMap[a] || a;
  });
}


/*****************************/
/***** Display/Show/Hide *****/
/*****************************/

function fDisplay(o, bShow) {     //  Call to show/hide an object, including enable/disabling it
  if (bShow) {
    fShow(o);
    fEnableFieldsRecursively(o);
  } else {
    fHide(o);
    fDisableFieldsRecursively(o);
  }
}

function fQkDisplay(o, bShow) {
  if ((fShowing(o) && bShow) || (fHiding(o) && !bShow))
    // if there,don't do anything
    return;
  fDisplay(o, bShow);
}

function fShowing(o) {
  return o.presence == "visible";
}
function fHiding(o) {
  return o.presence == "hidden";
}
function fShow(o) {
  o.presence = "visible";
}
function fHide(o) {
  o.presence = "hidden";
}
function fHideFirstInit(o) {
  if (bFirstInitializing) fDisplay(o, false);
} // on first time only,fully hide this thing
function fQuickHideFirstInit(o) {
  if (bFirstInitializing) fHide(o);
} // on first time only,quickly hide this thing
function fSuperHide(o) {
  o.presence = "invisible";
}

function fHideShow(o, bShow) {
  if (bShow) fShow(o);
  else fHide(o);
}
function fQuickHideBorderFirstInit(o) {
  if (bFirstInitializing) fBorderShowHide(o, false);
}

var borderColor = "224,189,43"; // Gold
var borderWidth = "0.0369in";
function fBorderShowHide(o, bShow) {
  if (bShow) {
    o.border.edge.presence = "visible";
    o.border.edge.color.value = borderColor;
    o.borderWidth = borderWidth;
  } else {
    o.border.edge.presence = "hidden";
    o.border.edge.color.value = "255,255,255"; // white
    o.borderWidth = "0.0";
  }
}

/*************************/
/***** DOM Traversal *****/
/*************************/
// Several Needs
// - Initialization - find out the default validation for this field
// - Enable/Disable - set the default validation for this field or disable all field validation
// - Read global variables from a subform into an associative array
// - Copy - copy from one subform to another
//      - as copying,make the 'to' be read only unless it's named "sfToOnly" - in which case leave as-is
//      - if the target is named "sfToOnly" then load it up with global values,as appropriate
////////////////////////////////////////////////

/*** ENTRY ***/
function fSaveFieldsStateRecursively(oNode) {
  fRunRecursively(oNode, 0); // Read all field attributes and save
}
function fDisableFieldsRecursively(oNode) {
  fRunRecursively(oNode, 1); // Validation warnings are disabled.
}
function fEnableFieldsRecursively(oNode) {
  fRunRecursively(oNode, 2); // Validation warnings are enabled.
}
// Reading in Global variables
var globalFields = {};
function fStartReadingGlobals() {
  globalFields = {};
}
function fReadGlobals(oNode) {
  fRunRecursively(oNode, 3); // Validation warnings are disabled.
}
function fWriteGlobals(oNode) {
  fRunRecursively(oNode, 4); // Validation warnings are disabled.
}
function fDisableTab2(oNode) {
  fRunRecursively(oNode, 6); // Disable everything,hide sfToOnly
}
function fFormPreSave(oNode) {
  fRunRecursively(oNode, 7); // Disable everything,hide sfToOnly
}
function fFormMakeReadOnly(oNode) {
  fRunRecursively(oNode, 8); // Leave visibility,SHOW sfToOnly,all read only
}
function fFormMakeReadWrite(oNode) {
  fRunRecursively(oNode, 9); // Leave visibility,HIDE sfToOnly,return to correct state
}

/*** HELPERS ON DOM ***/
function fSaveNodeAttr(o) {
  if (o.className == "field" && o.ui.oneOfChild.className == "checkButton") {
    // checkbox only can do script
    vaFldTest[o.somExpression] =
      "na" + "|" + "na" + "|" + o.validate.scriptTest + "|" + o.access;
  } else {
    vaFldTest[o.somExpression] =
      o.validate.nullTest +
      "|" +
      o.validate.formatTest +
      "|" +
      o.validate.scriptTest +
      "|" +
      o.access;
  }
}

function fShowRWStatus(a, o) {
  if (o.className == "field" && o.ui.oneOfChild.className == "checkButton") {
    // checkbox only can do script
    fLog(a + " (button):" + o.validate.scriptTest + "/" + o.access);
  } else {
    fLog(a + " (field):" + o.validate.nullTest + "/" + o.access);
  }
}

function fDisable(o) {
  if (o.className == "field" && o.ui.oneOfChild.className == "checkButton") {
    // checkbox only can do script
    o.validate.scriptTest = "disabled";
    o.access = "readOnly";
  } else {
    o.validate.nullTest = "disabled";
    o.validate.formatTest = "disabled";
    o.validate.scriptTest = "disabled";
    o.access = "readOnly";
  }
}

// 9/27/17 - test - only change if different
// Nah - didn't seem to help...
function fEnable(o) {
  var aSom = o.somExpression;
  if (aSom in vaFldTest) {
    var aVal = vaFldTest[aSom];
    var vVal = aVal.split("|");
    if (o.className == "field" && o.ui.oneOfChild.className == "checkButton") {
      // checkbox only can do script
      o.validate.scriptTest = vVal[2];
    } else {
      o.validate.nullTest = vVal[0];
      o.validate.formatTest = vVal[1];
      o.validate.scriptTest = vVal[2];
    }
    o.access = vVal[3];
  } else {
    fDisable(o);
  }
}

/*** TRAVERSAL ***/
function fRunRecursively(oNode, iProcess) {
  if (
    oNode.className == "subform" ||
    oNode.className == "subformSet" ||
    oNode.className == "area"
  ) {
    if (oNode.name == "sfToOnly") {
      switch (iProcess) {
        case 0: // Saving fields in tab 1&2
          return; // nothing under here to save
        case 1: // Disabling fields recursively - tab 1&2 only
          break; // for safety's sake,let go through
        //    return; // should already be disabled under this
        case 2: // enable fields - tab 1&2
          fHide(oNode); // not shown in tab 2
          return; // should already be hidden - tab 1&2 only
        case 3: // read globals
          return; // not needed
        case 4: // write globals
          break; // definitely write out inside here
        /*
                case 5:     // nothing under here to disable
                    break;
                    */
        case 6: // disable completely - tab 2 only
          fHide(oNode); // not shown in tab 2
          break; // shouldn't need disabling
        case 7: // form pre-save - removed
          break;
        case 8: // show sfToOnly
          fShow(oNode);
          break; // 4/10/18 - added
        case 9:
          fHide(oNode);
          return;
      }
    }
    if (oNode.name == "sfToOnlyRW") {
      // Read/Write
      switch (iProcess) {
        case 0: // Saving fields in tab 1&2
          break; // need to save
        case 1: // Disabling fields recursively - tab 1&2 only
          break; // for safety's sake,let go through
        //    return; // should already be disabled under this
        case 2: // enable fields - tab 1&2
          fDisplay(oNode, false);
          break; // needs to recurse
        case 3: // read globals
          return; // not needed
        case 4: // write globals
          break;
        /*
                case 5:     // nothing under here to disable
                    break;
                    */
        case 6: // disable completely - tab 2 only
          fHide(oNode); // not shown in tab 2
          break; // shouldn't need disabling
        case 7: // form pre-save - removed
          break;
        case 8: // show sfToOnlyRW
          fDisplay(oNode, true); // force enabling of all fields
          return;
        case 9:
          //fHide(oNode);
          fDisplay(oNode, false);
          return;
      }
    }

    if (iProcess == 2 && fHiding(oNode))
      // don't enable anything under something hiding
      return;
    if (iProcess == 8 && fHiding(oNode))
      // don't disable anything hiding
      return;
    if (iProcess == 9 && fHiding(oNode))
      // don't enable anything hiding
      return;
    for (var i = 0; i < oNode.nodes.length; i++) {
      var oChildNode = oNode.nodes.item(i);
      fRunRecursively(oChildNode, iProcess);
    }
  } else if (oNode.className == "exclGroup") {
    if ((iProcess == 2 || iProcess == 9) && fHiding(oNode)) return;
    fFoundEndNode(oNode, iProcess); // radio button group
  } else if (oNode.className == "field") {
    // Radiobutton group or any field
    if ((iProcess == 2 || iProcess == 9) && fHiding(oNode)) return;
    switch (oNode.ui.oneOfChild.className) {
      case "button":
        if (oNode.name == "btnAdd" || oNode.name == "btnRemove") {
          if (iProcess == 8) {
            // disable
            fSuperHide(oNode); // invisible,not hidden
          } else if (iProcess == 9) {
            // enable
            fShow(oNode);
          }
        } else {
          //    fLog("rr btn?? " + oNode.name);
        }
        break;

      case "checkButton":
        fFoundEndNode(oNode, iProcess);
        break;

      case "textEdit":
      case "choiceList":
      case "dateTimeEdit":
      case "imageEdit":
      case "numericEdit":
      case "passwordEdit":
      case "signature":
      case "barcode":
        fFoundEndNode(oNode, iProcess);
        break;

      default:
        // unknown field type
        break;
    }
  }
}

function fFoundEndNode(oNode, iProcess) {
  switch (iProcess) {
    case 0: // save validation and access field defaults
      fSaveNodeAttr(oNode);
      break;
    case 1: // disable field
      fDisable(oNode);
      break;
    case 2:
      fEnable(oNode);
      break;
    case 3:
      globalFields[oNode.name] = oNode.rawValue;
      break;
    case 4:
      if (oNode.name in globalFields) oNode.rawValue = globalFields[oNode.name];
      break;
    case 5:
      fDisable(oNode);
      break;
    case 6:
      fDisable(oNode);
      break;
    case 8:
      fDisable(oNode);
      break;
    case 9:
      fEnable(oNode);
      break;
  }
}

function fMakeNewRowValidate(oFrom, oTo) {
  assert(oFrom != null, "Traveral - from was null");
  assert(oTo != null, "Traveral - to was null");

  if (
    oFrom.className == "subform" ||
    oFrom.className == "subformSet" ||
    oFrom.className == "area"
  ) {
    // It turns out that dynamically adding rows makes things 'not the same'
    // i.e.,a 'para' element is added at the end of the first row.
    // Net net,skip it
    var iRun = Math.min(oFrom.nodes.length, oTo.nodes.length);
    for (var i = 0; i < iRun; i++) {
      // oFrom may grow?
      var oChildFrom = oFrom.nodes.item(i);
      var oChildTo = oTo.nodes.item(i);
      fMakeNewRowValidate(oChildFrom, oChildTo);
    }
  } else if (oFrom.className == "exclGroup") {
    // checkboxes
    var aFldTest = vaFldTest[oFrom.somExpression];
    assert(aFldTest != null, "vaFldTest[oFrom.somExpression] - was null");
    vaFldTest[oTo.somExpression] = aFldTest;
  } else if (oFrom.className == "field") {
    assert(
      oFrom.name == oTo.name,
      "Traveral - names were different from:" + oFrom.name + ",to:" + oTo.name
    );
    switch (oFrom.ui.oneOfChild.className) {
      case "checkButton":
      case "textEdit":
      case "choiceList":
      case "dateTimeEdit":
      case "imageEdit":
      case "numericEdit":
      case "passwordEdit":
      case "signature":
      case "barcode":
        var aFldTest = vaFldTest[oFrom.somExpression];
        assert(aFldTest != null, "vaFldTest[oFrom.somExpression] - was null");
        vaFldTest[oTo.somExpression] = aFldTest;
        break;
      case "button":
      default:
        // unknown field type
        break;
    }
  }
}

/********************/
/***** Twisties *****/
/********************/

function fInitializeTwistie(oButton) {
  var oFullT = oButton.parent;
  oFullT.cbox.presence = "hidden";
  oFullT.down.x = oFullT.x;
  oFullT.down.y = oFullT.y;
  oFullT.up.x = oFullT.x;
  oFullT.up.y = oFullT.y;
  oFullT.TwistButton.x = oFullT.x;
  oFullT.TwistButton.y = oFullT.y;
  oFullT.TwistButton.w = oFullT.down.w;
  oFullT.TwistButton.h = oFullT.down.h;
  oFullT.cbox.x = oFullT.x;
  oFullT.cbox.y = oFullT.y;
  oFullT.cbox.w = oFullT.down.w;
  oFullT.cbox.h = oFullT.down.h;
  oFullT.w = oFullT.down.w; // and make the overall box the arrow size
  oFullT.h = oFullT.down.h;
  fSetTwistie(oButton); // And set the twistie to the appropriate first state}
}

function fClickTwistie(oButton) {
  // invert
  if (oButton.parent.cbox.rawValue == 1) {
    oButton.parent.cbox.rawValue = 0;
  } else {
    oButton.parent.cbox.rawValue = 1;
  }
  fSetTwistie(oButton);
}

function fSetTwistie(oButton) {
  if (oButton.parent.cbox.rawValue == 1) {
    oButton.parent.down.presence = "visible";
    oButton.parent.up.presence = "hidden";
    oButton.parent.parent.parent.HideShowSection.presence = "visible";
  } else {
    oButton.parent.up.presence = "visible";
    oButton.parent.down.presence = "hidden";
    oButton.parent.parent.parent.HideShowSection.presence = "hidden";
  }
}

function fShowTwistie(oButton) {
  oButton.parent.down.presence = "visible";
  oButton.parent.up.presence = "hidden";
  oButton.parent.parent.parent.HideShowSection.presence = "visible";
  oButton.parent.cbox.rawValue = 1;
}

/*****************/
/***** Tabs  *****/
/*****************/

function fInitAllTabs() {
  // Init time - clean up the UI - First time only!
  var oTabs = oTabStrip.aTab.all;
  var aBase = oTabStrip.somExpression;
  //    fLog("**fInitAllTabs");
  for (i = 0; i < oTabs.length; i++) {
    var aTabsom = aBase + ".aTab[" + i + "]";
    var oTab = resolveNode(aTabsom);
    oTab.cbOnOff.presence = "hidden"; // checkbox is hidden - this is needed to maintain state
    oTab.aButton.x = oTab.TabMid.x; // make the button in the right place
    oTab.aButton.y = oTab.TabMid.y;
    oTab.aButton.w = oTab.TabMid.w;
    oTab.aButton.h = oTab.TabMid.h;
    oTab.TabSelLeft.x = oTab.TabLeft.x; // the selected tabs are behind the normal tabs
    oTab.TabSelLeft.y = oTab.TabLeft.y;
    oTab.TabSelMid.x = oTab.TabMid.x;
    oTab.TabSelMid.y = oTab.TabMid.y;
    oTab.TabSelMid.w = oTab.TabMid.w;
    oTab.TabSelRight.x = oTab.TabRight.x;
    oTab.TabSelRight.y = oTab.TabRight.y;
    oTab.TabSelLeft.presence = "hidden";
  }
  fSetTabsTo(0); // though there already
}

function fClickaTab(oTabButton) {
  var oTabBase = oTabButton.parent.parent;
  var oTabs = oTabBase.aTab.all;
  var aBase = oTabBase.somExpression;
  var iToButton = 0; // set in loop to currently selected tab
  var oSelectedTab; // set in loop to currently selected tab subform

  // determine which tab we're going to
  for (i = 0; i < oTabs.length; i++) {
    var aTabsom = aBase + ".aTab[" + i + "]";
    oSelectedTab = resolveNode(aTabsom);
    if (oSelectedTab.aButton == oTabButton) {
      iToButton = i;
      break;
    }
  }

  if (oSelectedTab.cbOnOff.rawValue == 1) return; // clicked on already set tab

  // If we're trying to get to the third tab we need to validate - else abort
  if (iToButton == 2) {
    // if coming from tab 1,then must flesh out tab 2 first,e.g.,show the right sections
    //fLog("temporarily go to tab 1 just in case...");
    //fTabSwitchSetInfo(1);	// ensure right things are showing as we (try to) switch tabs
    bValidating = true;
    var res = form1.execValidate(); // tab 3 validation
    bValidating = false;
    if (!res) {
      return; // don't do a tab switch
    }
  }

  fTabSwitchSetInfo(iToButton); // ensure right things are showing as we (try to) switch tabs
  fSetTabsTo(iToButton); // changes tab appearance,macro show area
  xfa.host.setFocus(oTabButton.somExpression);
}

function fSetTabsTo(iButton) {
  var oTabs = oTabStrip.aTab.all;
  var aBase = oTabStrip.somExpression;
  for (i = 0; i < oTabs.length; i++) {
    var aTabsom = aBase + ".aTab[" + i + "]";
    var oTab = resolveNode(aTabsom);
    var aShowArea;
    var iShow = i == 2 ? 1 : i; // no tab 3 anymore
    var aShowArea = aBase + ".ShowArea.aShow[" + iShow + "]";
    var oArea = resolveNode(aShowArea);

    if (i == iButton) {
      oTab.cbOnOff.rawValue = 1;
      oTab.TabText.font.weight = "bold";
      oTab.TabText.font.fill.color.value = "255,255,255";
      oTab.TabLeft.presence = "hidden";
      oTab.TabSelLeft.presence = "visible";
      oTab.TabMid.presence = "hidden";
      oTab.TabSelMid.presence = "visible";
      oTab.TabRight.presence = "hidden";
      oTab.TabSelRight.presence = "visible";
      oTab.aButton.assist.toolTip.value = msgTabName[i] + msgSelected;
      oArea.presence = "visible";
    } else {
      oTab.cbOnOff.rawValue = 0;
      oTab.TabText.font.weight = "";
      oTab.TabText.font.fill.color.value = "0,0,0";
      oTab.TabLeft.presence = "visible";
      oTab.TabSelLeft.presence = "hidden";
      oTab.TabMid.presence = "visible";
      oTab.TabSelMid.presence = "hidden";
      oTab.TabRight.presence = "visible";
      oTab.TabSelRight.presence = "hidden";
      oTab.aButton.assist.toolTip.value = msgTabName[i];

      if (i != 0 && iButton == 0)
        // hide tabs 2 & 3
        oArea.presence = "hidden";
      if (i == 0 && iButton != 0) oArea.presence = "hidden";
    }
  }
}

/***************/
/***** End *****/
/***************/
