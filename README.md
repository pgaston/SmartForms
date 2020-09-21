
# SmartForms
### An innovative way to use PDF files to deliver applications - rich UI, business logic, workflow, and RPA - simply built and universally delivered.

# Examples

Applications/common use cases include: (that have been created for large corporations)

- Enrollment into one or more of a suite of products
- Maintenance into one or more of a suite of products
- Legal document creation and workflow
- Customer onboarding
- 'Know Your Customer' processing and workflow
- Complicated product enrollment or maintenance
- Periodic reviews of mandated procedures
- and more...

![SmartForm Demo](/images/demo-KYC.png)

You can run the file demo.png to get a feel for an application.

# What's new here? Why should I care? Can't I just do this with Acrobat? A web site?

The core functionality of a pdf based SmartForm is difficult if not impossible to provide in other ways.
 These include:

- file based deployment - no web server needed
- universal acceptance (at least on desktops) - everyone has (or can easily get) Adobe Reader
- rich hide/show capability to allow both UI widgets, e.g., tabs, but also integrate business logic, e.g., capture optional paths of information
- simple workflow by emailing the form itself
- and easy intake to RPA engine.

If deploying using pdf there are alternative development tools, e.g., Acrobat. They just aren't rich enough. Specifically they don't provide a 'hide/show' capability that seem to be part of the key functionality of SmartForms. Think tabs, think business logic progressing through options.

For universal deployment your choices are either pdf or a web browser. A web browser can of course be an interesting deployment, however for this situation it is lacking key functionality, namely the ability to email 'itself' and file based distribution. i.e., while creating a custom web based form can create similar functionality, the costs to create and deploy - especially in a corporate environment can easily be 10x (e.g., the first thing you need is a web server...)

There are of course multiple, proprietary tools that can do forms development and deployment. However, Adobe got there first and owns the 'universal' aspect of deployment. Everything else pretty much requires buying client licenses.

Adobe Acrobat, other third party tools, and web based file solutions _do not_ provide this functionality. Lord knows I've tried.

# Where doesn't this apply?

If you use small, simple forms this isn't for you. This is for interesting/more involved forms that have UI elements such as tabs, business logic where certain fields are only shown when appropriate, potentially interesting output such as pre-filled contracts ready for execution, and potentially email based workflow routing.

The complexity of these apps can only go so far, as they are limited to a single file for deployment. Similarly, while enterprise integration, e.g., REST type calls are doable/have been done, the advantages of a full web solution overtakes this approach.

This does not deploy over the web (Adobe 'almost' brought out a pdf-Next that would've been able to do this), it does not deploy on mobile devices, and it doesn't work on non-Adobe/knock-off pdf readers (though they can be trapped and the user alerted.)

# Enough, get to the code

An Adobe pdf file allows javascript code to be integrated and manipulate the document objects.   Akin to, but not near enough to how html pages work. 

To start, you need the following tools:

- Adobe Experience Manager - Forms. Version 6.4.0. (Used to be called Livecycle Designer.)
- Excel - for RPA data dictionary.

Essentially the pdf editor is wysiwyg for the graphical layout and allows code to be attached to events, like validate, change, etc.   Pretty simple.    However, as complexity grows - as it has here, the Javascript tends to be kept in a separate area - you'll see it at the end of the form named cLookFeel.   

Validation of a field can be done using either built-in functionality for a pattern, or with code.   Turns out that code is usually required.   Here's an example of a simple validation for an email field

```javascript
var emailPatt = new RegExp("^[a-zA-Z0-9_\\-\\.]+\\@[a-zA-Z0-9_\\-\\.]+\\.[a-zA-Z]{2,8}$"); // (allows 2-8 characters in domain suffix)
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
```

Straight forward.   See the code for more examples.   It's in the file *cLookFeel.js* which is used inside the file *framework.pdf*.

## So what's in this Framework?

Key elements of this framework:
- UI Widgets - tabs, twisties
- Validation extensions - email, zip code/postal code, etc.
- Dynamic table support - nicely adding and removing rows, including supporting accessibility guidelines
- and more...
**and**
- Hide/Show support for validation.   This is a little subtle, but critical for these forms.   So let's expand on this...

### Hide/Show support

Take the case where the user needs to fill in an international address.    In the case of, say US and Canada the street and city are required.    However there is a separate drop-down for states and provinces, and a separate field for zip code and postal code.     Showing the appropriate field is easily controlled from, say a drop-down for the country field.

The problem, at least with Adobe pdf is that if you hide a field, it will still validate.   So if, say the country selected was US, it would still try and validate the postal code field for Canada.    This is bad.

Long story short, a reasonable amount of effort went into building a framework that can selectively hide a field and also disable it's validation, **and** also, when re-shown have the original validation rules.

# Give it a whirl!




##### git hints

git add -A
git commit -a -m "new stuff"
git push
