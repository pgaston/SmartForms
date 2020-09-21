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

// E-mail addresses on error - actual email addresses in JSON table
var aToError = "john.cho@acme.com";
var aToNA = aToError;

// Messages - both EN and FR
var msgTabName = bEN
  ? ["Service Needs tab", "Gather Information tab", "Implement Servicing tab"]
  : [
      "Onglet Besoins de service",
      "Onglet Rassembler informations",
      "Onglet Mettre en service",
    ];
var msgSubject = bEN ? "CM Maintenance - " : "Maintenance GT - ";
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

// Tab three
var oTab3ReqInstructions = fGetField("ReqInstructions", aTab2);
var oTab3ProcInstructions = fGetField("ProcInstructions", aTab2);
var oTab3btnSubmit = fGetField(
  "ReqInstructions.goInstructions.btnEmail",
  aTab2
);
var oTabListForms = fGetField("ProcInstructions.goInstr.txtForms", aTab2);

// Service is a combination of it's checkbox on tab 1 and the section it uses on tab 2
var vaServices = [
  {
    product: "Lockbox",
    email: "lockboxProcessing@acme.com",
    cb: fGetField(
      "geCB.grp.CollectTwistie.HideShowSection.tbl.row0.sf.cb",
      aTab1
    ),
    form: fGetField("Sect_RPSALBLockboxEDI", aTab2Forms),
  },
  {
    product: "Payment Receiver",
    email: "genlMaintenance@acme.com",
    cb: fGetField(
      "geCB.grp.CollectTwistie.HideShowSection.tbl.row1.sf.cb",
      aTab1
    ),
    form: fGetField("Sect_EDIPaymentReceiver", aTab2Forms),
  },
  {
    product: "Cheque Issuance",
    email: "genlMaintenance@acme.com",
    cb: fGetField(
      "geCB.grp.PaymentTwistie.HideShowSection.tbl.row0.sf.cb",
      aTab1
    ),
    form: fGetField("Sect_ChequeIssuance", aTab2Forms),
  },
];

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
  //fLog("splitOutBigString - length: " + a.length);
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
  // Hide all tab2 sub forms - turned on/off as we go to tab 2
  fDisplay(oTab2NoneSelected, false); // 'Please go back to tab one and select one or more services...
  fDisplay(oTab2OnToNext, false);
  fDisplay(oTab2Requestor, false);
  fDisplay(oTab2Overview, false);

  for (i = 0; i < vaServices.length; i++) {
    // Hide the section for each service
    var dService = vaServices[i];
    var oForm = dService["form"];
    fDisplay(oForm, false);
  }
}

var liStartLoad; // timing of load
function fFirstInitialization() {
  console.println("\n");
  fLog("**Initialization");
  liStartLoad = new Date().getTime(); // milliseconds
  fLog("Language " + (bEN ? "EN" : "FR"));

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
    var dService = vaServices[i];
    var oForm = dService["form"];
    fHide(oForm);
  }
}

/****************************/
/****** EMail Handling ******/
/****************************/

function fDoMultiEMail(cDoc) {
  fLog("fDoMultiEMail");
  fDescribeavEmailForms();

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
    var aUrl = "mailto:" + aEmail + "?subject=" + aSubject + "&body=" + aBody;

    fLog("pre diac: " + aUrl);
    aUrl = removeDiacritics(aUrl);
    fLog("EMAIL to " + aUrl);

    cDoc.submitForm({
      // mailForm fails security test for some reason...
      cURL: encodeURI(aUrl), // side effect is that the form is saved,i.e.,preSave is called - resetting all validations
      cSubmitAs: "PDF",
      cCharSet: "utf-8",
    });

    fLog("back from email call");
  }

  // reset to showing all forms selected in tab 3 - but don't show requester or processor instructions
  fSetClientSegment(false);

  // This is case where user can do whatever they want...
  fLog("Allowing user to edit and resend if interested...");
  fShow(oTabTab1);
  fShow(oTabTab2);
  fShow(oTab3ReqInstructions);
  fHide(oTab3ProcInstructions);

  fLog("fDoMultiEMail - DONE");
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

// -Sets the right tab1 display
// -Shows the right forms for tab2/tab3, including commons subsections
// -Collects routing information for active forms
// -bTab2 - if going to tab 2 then we need to ensure things are fully setup
// returns true if any tab1 services are selected
function fSetClientSegment(bTab2) {
  var bAny = false; // figure out if anything is checked, return that
  for (i = 0; i < vaServices.length; i++) {
    var dService = vaServices[i];
    var oForm = dService["form"];
    var ocb = dService["cb"]; // checkboxes
    var bOn = ocb.rawValue == 1;
    fQkDisplay(oForm, bOn);
    bAny |= bOn;
  }

  return bAny; // any check boxes checked?
}

// Build the dictionary
// Key: unique email address(es)
// Value: array of forms to be sent there
function fBuildEMailRouting() {
  avEmailForms = {}; // reset global variable.    for some reason we setup all email addresses now...

  for (i = 0; i < vaServices.length; i++) {
    var dService = vaServices[i];
    var oForm = dService["form"];
    var aFormName = dService["product"];
    var aEmail = dService["email"];
    var ocb = dService["cb"]; // checkbox
    var bOn = ocb.rawValue == 1;
    //fLog("found email form - " + aEmail + " - " + aFormName + " - "+ bOn);
    if (bOn) {
      fLog("found email to add - " + aEmail + " - " + aFormName);
      addEmailForm(aEmail, aFormName, oForm);
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

function fCopyGlobalsT1T3() {
  // Copy global fields
  fStartReadingGlobals(); // clears out global area
  fReadGlobals(oTab1Fields); // read tab one
  fWriteGlobals(oTab2Forms); // write to tab 2/3
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

// Adding a row to a table:
// - add the row - not there is confusion as to this screwing the base variable up?
// - fix table for accessibility - assumes consistent naming of 'Remove' button
// - add all new fields on the new row to the validation table
function fAddARow(oTable) {
  aTableSOM = oTable.somExpression; // addInstance can screw things up... ???
  oTable.Row.instanceManager.addInstance();

  var oRows = fGetAllTableRows(aTableSOM);
  for (var i = 0; i < oRows.length; i++) {
    // loop through rows
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

function fDisplay(o, bShow) {
  //  Call to show/hide an object, including enable/disabling it
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
