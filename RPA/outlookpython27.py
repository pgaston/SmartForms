# collect Referrals from outlook
# get attachment, parse out fields
# dump to csv/excel

import pandas as pd
from pandas import DataFrame, ExcelWriter
import os
#import win32com.client
from win32com.client import Dispatch   # outlook stuff
import PyPDF2
from PyPDF2 import PdfFileWriter,PdfFileReader
import xml.etree.ElementTree as ET
import re
import datetime
import sys
import tempfile    # 180917
import traceback   # 180917

# list of fields we're interested in
# This is *not* for the framework.pdf file...
fldsUs = ['emailType','version','cbUserState','globalBusinessContactEMail','globalClientName','globalFormDate',
          'ClientLocation','globalClientSRF','ClientManagementList','StartUp','ClientCardEntitlementList','OtherCompanies',
          'nfGuaranteesDomesticTransactionsFee','Comments2','rbFeedback','CompletedDate']

# First extract all possible fields from the pdf
#  1 - from dataset - normal place for values
#  2 - from form itself - for some reason the globalFormDate field value is there...
# Second extract all fields that we're interested in

allFlds = {}
def addToAllFlds(tag,value):
    global allFlds    # clear out any existing list
    
    if tag == "tfSilentStore":   # no need to keep
        return
    
    if not tag in allFlds:
        allFlds[tag] = value
        return

    for i in range(1,200):
        newTag = tag+"-"+str(i)
        if not newTag in allFlds:
            allFlds[newTag] = value
            return

    print "YOWZA - "+tag+" - too many redundant tags!!!!"
        

def getAllLastNodeValues(oNode):
    foundOne = False
    for child in oNode:
        foundOne = True
        getAllLastNodeValues(child)
    if not foundOne:
        if oNode.text is not None:
            addToAllFlds(oNode.tag,oNode.text)
            #print "found",oNode.tag,oNode.text
            
def innertext(tag):
  return (tag.text or '') + ''.join(innertext(e) for e in tag) + (tag.tail or '')

def getAllFieldValues(oNode):
    # This one?
    #print "gAFV",oNode.tag
    if oNode.tag == "field":
        fldName = oNode.attrib['name']
        fldValue = innertext(oNode)
        addToAllFlds(fldName,fldValue)
    else:
        for child in oNode:
            foundOne = True
            getAllFieldValues(child)

def findInDict(needle,haystack):
    for key in haystack.keys():
        try:
            value = haystack[key]
        except:
            continue
        if key == needle:
            return value
        #if (type(value) is dict) or (isinstance(value,PyPDF2.generic.DictionaryObject)):  
        if isinstance(value,dict) or isinstance(value,PyPDF2.generic.DictionaryObject):  
            x = findInDict(needle,value)
            if x is not None:
                return x

def getAllPDFValues(fname):
    global allFlds    # clear out any existing list
    allFlds = {}
    
    # think about closing after opening?
    #    with open(fname, "rb") as f:
    #        pdf = PdfFileReader(f, "rb"),strict=False)


    pdf = PdfFileReader(open(fname, 'rb'),strict=False)
    pdfR = pdf.resolvedObjects
    xfa = findInDict('/XFA',pdfR)  

    # variable values can be either in the dataset or buried in the form
    oDataSet = xfa[9].getObject()  # dataset
    aDS = oDataSet.getData()
    dsTree = ET.fromstring(aDS)
    getAllLastNodeValues(dsTree)
    
    oForm = xfa[15].getObject()    # form - holds some values
    aForm = oForm.getData()
    aForm = re.sub(' xmlns="[^"]+"', '', aForm, count=1)  # remove namespace
    dsForm = ET.fromstring(aForm)

    # debug
    #allFlds = {}    
    getAllFieldValues(dsForm)
    
    # Now, get what we're interested in
    fldValues = {}
    for fld in fldsUs:
        if fld=='':
            print("found empty fld")
        if fld in allFlds:
            fldValues[fld] = allFlds[fld]
        else:
            fldValues[fld] = ''

    # extra special
    if 'ImportExport-1' in allFlds:
        rImportExport = ''
        if 'ImportExport' in allFlds:
            rImportExport = allFlds['ImportExport']
        ImportExport = allFlds['ImportExport-1']
        fldValues['rImportExport'] = rImportExport
        fldValues['ImportExport'] = ImportExport
        #print "IE fix ",rImportExport,ImportExport
    if 'GuaranteesDomesticTransactions' in allFlds:
        rGuarantees = ''
        if 'Guarantees' in allFlds:
            rGuarantees = allFlds['Guarantees']
        Guarantees = allFlds['GuaranteesDomesticTransactions']
        fldValues['rGuarantees'] = rGuarantees
        fldValues['Guarantees'] = Guarantees
    if 'Comments-1' in allFlds:
        fldValues['Comments2'] = allFlds['Comments-1']
        
    return fldValues

# not used
def indent(elem, level=0):
  i = "\n" + level*"  "
  if len(elem):
    if not elem.text or not elem.text.strip():
      elem.text = i + "  "
    if not elem.tail or not elem.tail.strip():
      elem.tail = i
    for elem in elem:
      indent(elem, level+1)
    if not elem.tail or not elem.tail.strip():
      elem.tail = i
  else:
    if level and (not elem.tail or not elem.tail.strip()):
      elem.tail = i



if False:
    fVals = getAllPDFValues("email.pdf")
    allFlds
    fVals

def extractFromPDF(fn):
    try:
        fflds = getAllPDFValues(fn)        
        #print "extractFromPDF BACK - ",fflds
        return fflds
    except Exception:
        print "Unexpected error in extractFromPDF:",fn   # ," error ", sys.exc_info()[0]

        return None

def getPDFAttachments():
    df = None
    outlook = Dispatch("Outlook.Application").GetNamespace("MAPI")
    inbox = outlook.GetDefaultFolder(6)
    
    # 180917 - make temp files, get their filename, then close so we can re-use...
    fn = tempfile.TemporaryFile(suffix=".pdf")
    fnTempPDF = fn.name
    fn.close()

    fn = tempfile.TemporaryFile(suffix=".csv")
    fnTempCSV = fn.name
    fn.close()

    fn = tempfile.TemporaryFile(suffix=".xlsx")
    fnTempXLSX = fn.name
    fn.close()

    print(fnTempPDF)
    print(fnTempCSV)
    print(fnTempXLSX)
    print("all made...")
    
    # sub-folder under Inbox
    referrals = inbox.Folders("Referrals3")    # 180917 - match the folder in outlook, under the inbox
    messages = referrals.Items
    print "Number of messages to process: "+str(len(messages))
    i = 0
    for msg in messages:
        i = i+1
        try:
            print "processing message "+str(i)+" from "+msg.SenderName+" rcvd "+str(msg.ReceivedTime)  #+" att:"+str(len(msg.Attachments))
            sys.stdout.flush()
            #print "Sender: "+msg.SenderName
            #print "Subject: "+msg.Subject
            #print "Number of Attachments: "+str(len(msg.Attachments))
            
            for att in msg.Attachments:
                if True:    # att.FileName[:5]=='file-':  
                    #print str(i)+" - WORKING ON ", att.FileName
                    try:
                        filename, file_extension = os.path.splitext(att.FileName)
                    except Exception:   # something wrong with att.FileName...
                        pass
                        break

                    if file_extension.lower()==".pdf":
                        # Changed to use temp file fnTempPDF
                        att.SaveAsFile(fnTempPDF)
                        fldVals = extractFromPDF(fnTempPDF)
                        if fldVals <> None:
                            #print "GOT SOMETHING",fldVals['globalBusinessContactEMail']
                            fldVals['msgSenderName'] = msg.SenderName
                            fldVals['msgSenderEmailAddress'] = msg.SenderEmailAddress
                            fldVals['msgSentOn'] = msg.SentOn
                            fldVals['msgTo'] = msg.To
                            fldVals['msgCC'] = msg.CC
                            fldVals['msgBCC'] = msg.BCC
                            fldVals['msgSubject'] = msg.Subject
                            fldVals['msgBody'] = msg.Body
                            fldVals['msgRcvd'] = str(msg.ReceivedTime)
                            
                            newdf = pd.DataFrame(fldVals, index=[0])
                            
                            #print "have new one",newdf.shape
                            #print "df is ",df
                            if df is None:
                                df = newdf
                                #print "first time size is",df.shape
                            else:
                                #print "appending..."
                                df = df.append(newdf, ignore_index=True)
                                #print "size is now",df.shape
                            #return pd.DataFrame(fldVals, index=[0]) 
                            #pass
                    #print "stop early"
                    #return df
                else:
                    #print "skipping",att.FileName
                    pass
                
        except Exception:
            print "Unexpected error in loop: "+msg.SenderName+" - "+msg.Subject
            traceback.print_exc()
            pass   #ignore problems...
    #return df

    try:
        print "Outputting to excel"
        #print "size is now",df.shape
        if False:    # csv does not handle multi-line strings well...  So don't generate
            #outFnameCSV = "Referral dump-"+"{:%Y%m%d}".format(datetime.datetime.now())+".csv"
            df.to_csv(fnTempCSV, index=False, encoding='utf-8')   # 180917 - use temp file
            print "CSV Saved to ",fnTempCSV," with",df.shape[0],"rows:"
        
        #outFname = "Referral dump-"+"{:%Y%m%d}".format(datetime.datetime.now())+".xlsx"
        print df
        writer = pd.ExcelWriter(fnTempXLSX, engine='xlsxwriter')   # 180917 - use temp file
        df.to_excel(writer, sheet_name='Sheet1',index=False)
        writer.save()
        print "Saved to ",fnTempXLSX," with",df.shape[0],"rows:"
    except Exception:
        print "NO MESSAGES WITH (VALID) ATTACHMENTS FOUND!   Maybe you have the excel file still open?"
        
    
print "start - Version github 200922"
getPDFAttachments()
print "done"



