# SmartForms

A set of tools to provide process support for the Enterprise. Provided are:

- pdf based 'SmartForm' for user friendly entry of information, business logic integration, and simple workflow.
- RPA support for automatic 'ingestion' of completed forms.

## So what?

- Provides interesting functionality including a rich UI (tabs and other widgets), business logic, and simple workflow
- Delivers applications that can be deployed as files, and everyone has (or can easily get) Adobe Reader to execute
- simple to build, very inexpensive to deploy.

## What's interesting here?

This framework supports interesting forms based solutions that vanilla Adobe pdf will not. Also lots of interesting helper functions based on over a decade of implementations.

## Why should I care?

If you use small, simple forms this isn't for you. This is for interesting/more involved forms that have UI elements such as tabs, business logic where certain fields are only shown when appropriate, potentially interesting output such as pre-filled contracts ready for execution, and potentially email based workflow routing.

Adobe Acrobat and other third party tools _do not_ provide this functionality. Lord knows I've tried.

This does not deploy over the web (Adobe 'almost' brought out a pdf-Next that would've been able to do this), it does not deploy on mobile devices, and it doesn't work on non-Adobe/knock-off pdf readers (though they can be trapped and the user alerted.)

## Examples

image here

Applications include: (that have been created for large corporates)

- Enrollment into one or more of a suite of products
- Maintenance into one or more of a suite of products
- Legal document creation and workflow
- Customer onboarding
- 'Know Your Customer' processing and workflow
- Complicated product enrollment or maintenance
- Periodic reviews of mandated procedures
- and more...

## Quick History

A colleague and I 'discovered' that one could build little applications inside of Adobe pdf back in, oh 2007. We used this to prototype a tool - a credit origination application. From there, multiple sources became interested and the number of applications grew considerably. The tool at that time, Livecycle was very difficult to use though - let's just say one continually saved ones work.

It turns out that common tools just didn't provide the functionality we wanted. What you have here is the result of over a decade of real world experience and deployment at very large clients.

# Implementation

Tools needed:

- Adobe Experience Manager - Forms. Version 6.4.0. (Used to be called Livecycle Designer.)
- Excel - for RPA data dictionary.

## Background - an 'active' pdf file
