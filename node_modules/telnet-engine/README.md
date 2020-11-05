# telnet-engine

The goal of this module is to provide a simple way to manage a dialog with a telnet server over IP.  It is meant to simplify sending queries to a server and treating the responses asynchronously. The Engine establishes one socket to the server, which can be used asynchronously from different parts of the code. The Engine ensures that the link is up, queues, and, if necessary, spaces the requests and matches responses with the corresponding query. 

This guide is organized into two sections:

* **Overview:**   Is a quick run through meant to expose to the operation of the module.
* **Reference:**  Provides a syntax and usage reference of each object and method.

# Basic utilization

## Opening the connection: the Engine object

The communication is established by the telnet-engine constructor, which takes two arguments the host address and the communication port:

  ```new Engine(host,port)```

Every time the **Engine** uses the connection, it checks first that the communication is up, and if necessary, attempts to reopen the socket. 

Several properties of the **Engine** can be modified to adjust its behavior, see the Reference section for details. 

An Engine maintains a FIFO command queue. Most methods put a command in the queue. Commands are executed sequentially in the order they were entered in the queue, and a command has to complete before the next one starts. 

### Example 
```
var te = require("telnet-engine")
var en = new te.Engine("rainmaker.wunderground.com",23)
en.listenString(console.log)
en.flush() // every message from the server will be printed
```
The ``en.listenString(foo) ``  method instructs the **Engine** to send every incoming line of text to the function **foo**. 
``en.flush() `` asks the engine to process the text in the server buffer.

### Output
```
------------------------------------------------------------------------------
*               Welcome to THE WEATHER UNDERGROUND telnet service!            *
------------------------------------------------------------------------------
*                                                                            *
*   National Weather Service information provided by Alden Electronics, Inc. *
*    and updated each minute as reports come in over our data feed.          *
*                                                                            *
*   **Note: If you cannot get past this opening screen, you must use a       *
*   different version of the "telnet" program--some of the ones for IBM      *
*   compatible PC's have a bug that prevents proper connection.              *
*                                                                            *
------------------------------------------------------------------------------
```

## Sending a query. 

The method ```requestString() ``` provides a way to send a one-line of text to the server and process a response.
In its basic form, it takes one argument,  a **string**, and expects one line of text in return. 

### Example 
```
var te = require("telnet-engine")
var en = new te.Engine("rainmaker.wunderground.com",23)
en.flush() // this discard the openening lines shown in the previous example.
en.listenString(console.log)
en.echoString((s)=>{console.log("->",s)}) // apply function to each sent line
en.requestString("a") // send "" and print returned line
en.requestString("b")
en.requestString("c")
en.terminate() // terminate the engin
```
The ``en.echoString(foo) ``  method instructs the **Engine** to send every outgoing line of text to the function foo. 
### Output
```
-> a
Press Return to continue:
-> b
Press Return for menu
-> c
or enter 3 letter forecast city code-- 
```
By default, **sendString** expects one line of text in response. 

Engine methods create commands that are put in a queue. Commands are executed sequentially in the order they were entered on the queue, and a command has to complete before the next one starts. 

## Sending a request and accepting a multiline response. 
 ```requestString() ```  accepts an addition parameter representing a test function to determine the end of the response from the server. The test function will be called with each line received from the server as an argument. 
 
 In general, there is no need to program the test function; the module provides a set of test function generators that can create them automatically in most use cases. 
  
### Example 
```
var te = require("telnet-engine")
var en = new te.Engine("rainmaker.wunderground.com",23)
var n = 1
en.listenString((s)=>{console.log(n+">",s);n= n+1})
en.requestString("",te.untilNumLines(6))
en.terminate()
```
```te.untilNumLines(6) ``` generates a test function that expects six lines of text in a response.
### Output
```
1 > ------------------------------------------------------------------------------
2 > *               Welcome to THE WEATHER UNDERGROUND telnet service!            *
3 > ------------------------------------------------------------------------------
4 > *                                                                            *
5 > *   National Weather Service information provided by Alden Electronics, Inc. *
6 > *    and updated each minute as reports come in over our data feed.          *
```
### Test function generators

The following test function generators are included in the module. Generators are functions that return a test function based on the input parameter; they take care of implementation details.  It is the test function that needs to be passed to the request, not the generator. 

| Generator| Use 
| ------------- |----
|```te.untilString(s)```    |        The last line of the response contains the string s
|```te.untilRegEx(r)```    |        The last line of the response contains the regular expression r
|```untilPrompt(s)```    |          Until the prompt **s** appears in an unterminated response line
|```te.untilNumLines(n)```|        The response contains n lines
|```te.untilMilli(t)```    |        The reponse is complete if no more text is received after a pause of t milliseconds. 
|```te.oneLine()```    |            The response contains one line (default)
|```te.noResponse()```    |            No response expected
|```te.untilTrue(f)```    |     This is a generic generator.  **f** is an arbitrary test function that should accept a line of text as an argument and return **true** if it detects the last line of a response.

if omitted, ```te.oneLine()``` is the default.

### Example 
```en.echoString(foo)``` tells the **Engine** to pass a copy of every line of text sent to the server to the function **foo**.
```
var te = require("telnet-engine")
var en = new te.Engine("rainmaker.wunderground.com",23)
en.listenString(console.log)
en.echoString((s)=>{console.log("->",s)}) 
en.requestString(null,te.untilPrompt("Press Return to continue:"))
en.requestString("",te.untilPrompt("-- "))
en.requestString("NYC",te.untilMilli(500))
en.terminate()
```
### Output
```
------------------------------------------------------------------------------
*               Welcome to THE WEATHER UNDERGROUND telnet service!            *
------------------------------------------------------------------------------
*                                                                            *
*   National Weather Service information provided by Alden Electronics, Inc. *
*    and updated each minute as reports come in over our data feed.          *
*                                                                            *
*   **Note: If you cannot get past this opening screen, you must use a       *
*   different version of the "telnet" program--some of the ones for IBM      *
*   compatible PC's have a bug that prevents proper connection.              *
*                                                                            *
*           comments: jmasters@wunderground.com                              *
------------------------------------------------------------------------------
Press Return to continue:
-> 
Press Return for menu
or enter 3 letter forecast city code-- 
-> NYC
Weather Conditions at 08:51 AM EDT on 06 May 2020 for New York JFK, NY.
Temp(F)    Humidity(%)    Wind(mph)    Pressure(in)    Weather
========================================================================
  51          63%         EAST at 15       29.88      Mostly Cloudy
Forecast for New York, NY
1032 am EDT Wed may 6 2020
.Today...Cloudy. A slight chance of light rain late this morning,
then light rain likely this afternoon. Highs in the mid 50s. East
winds around 10 mph with gusts up to 20 mph. Chance of rain
70 percent. 
.Tonight...Cloudy. Light rain likely, mainly in the evening. Lows
in the lower 40s. Northeast winds 5 to 10 mph, becoming northwest
after midnight. Chance of rain 70 percent. 
.Thursday...Mostly sunny. Highs in the mid 60s. Northwest winds
10 to 15 mph. 
.Thursday night...Partly cloudy in the evening, then becoming
mostly cloudy. Lows in the mid 40s. West winds 10 to 15 mph. 
.Friday...Partly sunny in the morning, then mostly cloudy with
showers likely in the afternoon. Highs in the upper 50s. West
winds 5 to 10 mph, becoming southwest with gusts up to 20 mph in
the afternoon. Chance of rain 60 percent. 
```
## Processing a response line.
 ```requestString() ```  also accepts a string processing function as a third argument. Each line of text received is passsed to this function.  
 
### Example 
In this example, ```listenString()``` is not used, but the function passed to  ```requestString() ``` takes care of printing the incoming lines of text.

```
var te = require("telnet-engine")
var en = new te.Engine("rainmaker.wunderground.com",23) 
en.requestString(null,te.untilPrompt("Press Return to continue:"))     //nothing done with the response
en.requestString("",te.untilPrompt("-- "),console.log)                 //prints every line
en.requestString("NYC",te.untilMilli(500),(s)=>{console.log(s.slice(0,10))})    //prints 10 characters of every line
en.terminate()
```
### Output
```
Press Return for menu
or enter 3 letter forecast city code-- 
Weather Co
Temp(F)   
==========
  51      

Forecast f
1032 am ED

.Today...C
then light
winds arou
70 percent
.Tonight..
in the low
after midn
.Thursday.
10 to 15 m
.Thursday 
mostly clo
.Friday...
showers li
winds 5 to
the aftern
```

## Requests as Promises

```requestString() ```  returns a **Promise** and executes asynchronously. Once the request is completed, that is, once the end test is met, the **Promise** is fulfilled. If the request times out, the **Promise** is rejected. The status of the **Promise** can be captured by the **then/catch/finally** construct.

The resolution value of the **Promise**, as well as its rejection value, is an array of string representing all the lines received as part of the response or an array of the value returned by the  ```requestString() ```   processing function is it is present.

### Example 
```
var te = require("telnet-engine")
var en = new te.Engine("rainmaker.wunderground.com",23)
en.listenString(console.log)

en.requestString(null,te.untilPrompt("Press Return to continue:"))
    .then(()=>{console.log("1==== found the prompt")})
    .catch(()=>{console.log("2=== couldn't find the prompt")})

en.requestString("",te.untilPrompt("ThisIsNotTheCorrectPrompt"))
    .then(()=>{console.log("3=== found the prompt")})
    .catch(()=>{console.log("4=== couldn't find the prompt")})
    .finally(()=>{console.log("5=== finished");en.terminate()})
en.terminate()
```

### Output
```
------------------------------------------------------------------------------
1==== found the prompt
*               Welcome to THE WEATHER UNDERGROUND telnet service!            *
------------------------------------------------------------------------------
*                                                                            *
*   National Weather Service information provided by Alden Electronics, Inc. *
*    and updated each minute as reports come in over our data feed.          *
*                                                                            *
*   **Note: If you cannot get past this opening screen, you must use a       *
*   different version of the "telnet" program--some of the ones for IBM      *
*   compatible PC's have a bug that prevents proper connection.              *
*                                                                            *
------------------------------------------------------------------------------
Press Return to continue:
Press Return for menu
4=== couldn't find the prompt
5=== finished
```

Notice the order in which the output lines appear. It reflects the fact that the operation of the Engine is asynchronous. In this case, the calls to the call-back function ```console.log```in ```listenString(console.log)```  are intertwined with the resolution of the first **then/catch** construct.

### Example 
In this example, we use the fact that the resolution of ```requestString()``` returns an array.  The first request doesn't include a processing function, so the returned array is composed of the lines of text received. The second request includes a processing function, so the array is made of the values returned by that function (i.e., the length of each line of text).
```
var te = require("telnet-engine")
var en = new te.Engine("rainmaker.wunderground.com",23)

en.requestString(null,te.untilPrompt("Press Return to continue:"))
    .then((s)=>{console.log(s)})

en.requestString("",te.untilMilli(100),(s)=>{return s.length})
    .then((s)=>{console.log(s)})
en.terminate())
```

### Output
```
[
  '------------------------------------------------------------------------------',
  '*               Welcome to THE WEATHER UNDERGROUND telnet service!            *',
  '------------------------------------------------------------------------------',
  '*                                                                            *',
  '*   National Weather Service information provided by Alden Electronics, Inc. *',
  '*    and updated each minute as reports come in over our data feed.          *',
  '*                                                                            *',
  '*   **Note: If you cannot get past this opening screen, you must use a       *',
  '*   different version of the "telnet" program--some of the ones for IBM      *',
  "*   compatible PC's have a bug that prevents proper connection.              *",
  '*                                                                            *',
  '------------------------------------------------------------------------------',
  '',
  'Press Return to continue:'
]
[ 0, 21 ]
```

## Timing of execution

Engine methods put commands in its FIFO  queue (see Reference for exceptions), and the Engine processes them sequentially in the order received. The Engine also waits until a request to the server is fulfilled before sending the next one. Code containing a succession of requests will execute from end to end without a problem; even is the program includes multiple sequences in different parts of the program. Each sequence will be executed from end to end uninterrupted.

```requestString() ``` as well as the most of Engine methods return Promises and execute Asynchronously

### Conditional execution

There will be many situations in which the output of one **Request** will determine the content of the next one.
A useful feature in such cases is the fact that the text argument of a request can be replaced by a function that returns a string. The function will be calculated just before the **Engine** sends the line of the text to the server.

### Example 
In this example the processing function **f1** detects and stores the digits at the beginning of the line containing the words "Canad". **f2**  theses numbers as the text of the second query. 
```
var te = require("telnet-engine")
var en = new te.Engine("rainmaker.wunderground.com",23)
en.listenString(console.log)

en.requestString(null,te.untilPrompt("Press Return to continue:"))
en.requestString("",te.untilPrompt("-- "))
var lineNumber
//f1 stores the number at the begining of the line for Canada
f1= (s)=>{if(s.includes("Canad")){lineNumber = /\d+/.exec(s)[0]}}
lineNumber = 236  //this line has not effect (See explanation here under)
en.requestString("",te.untilMilli(100),f1)
//f2 returns the value stored
f2= ()=>{return lineNumber}
en.requestString(f2,te.untilMilli(100))
en.terminate()
```
It is important to keep in mind that this entire block of code is executed first and the **request**s as well as **f1** and **f2** are executed later. This is why the the line ```lineNumber = 236 ```has not effect, the value 236 is overwritten later when **f1** is executed. 

### Output
```
------------------------------------------------------------------------------
*               Welcome to THE WEATHER UNDERGROUND telnet service!            *
------------------------------------------------------------------------------
*                                                                            *
*   National Weather Service information provided by Alden Electronics, Inc. *
*    and updated each minute as reports come in over our data feed.          *
*                                                                            *
*   **Note: If you cannot get past this opening screen, you must use a       *
*   different version of the "telnet" program--some of the ones for IBM      *
*   compatible PC's have a bug that prevents proper connection.              *
*                                                                            *
------------------------------------------------------------------------------
Press Return to continue:
Press Return for menu
or enter 3 letter forecast city code-- 
                 WEATHER UNDERGROUND MAIN MENU
                ******************************
                 1) US forecasts and climate data
                 2) Canadian forecasts
                 3) Current weather observations
                 4) Ski conditions
                 5) Long-range forecasts
                 6) Latest earthquake reports
                 7) Severe weather
                 8) Hurricane advisories
                 9) Weather summary for the past month
                10) International data
                11) Marine forecasts and observations
                12) Ultraviolet light forecast
                 X) Exit program
                 C) Change scrolling to screen
                 H) Help and information for new users
                 ?) Answers to all your questions
                   Selection:
                          CANADIAN FORECASTS
        --------------------------------------------------------
       1) Southern Alberta             12) Southern Ontario
       2) Northern Alberta             13) Northern Ontario
       3) Coastal British Columbia     14) Northwest Ontario
       4) Interior British Columbia    15) Southern Saskatchewan
       5) Southern Manitoba            16) Northern Saskatchewan
       6) Northern Manitoba            17) Yukon
       7) Nova Scotia                  18) Western Quebec
       8) Prince Edward Island         19) Central Quebec
       9) New Brunswick                20) Northwest Territories
      10) Labrador                     21) Ottawa, SE Ontario
      11) Newfoundland
       M) Return to main menu
       X) Exit program
```

### Promise chaining

Promise chaining is another way to manage conditional execution; it allows for much more complicated chains of requests and truly conditional execution. Most **Engine** methods, including **request()**, return  a **Promise** that is resolved once the command is completed. If the content of a request determines what type of request must follow, promise chaining can be the solution. This approach allows delaying putting a Request on the Engine execution queue until a previous request is fulfilled. 

### Example 
In this example, we ask for the weather report in NYC and then either the report for MIA or BOS, depending on whether the temperature in NYC is an odd or even number.

The processing function **f1** captures the digits of the temperature and stores them in a variable. This variable **temp** is used later in the **then()** for an **If** branching. 
```
var te = require(".telnet-engine")
var en = new te.Engine("rainmaker.wunderground.com",23)
var temp
en.listenString(console.log)
//temp will capture the first set of digit at the begining of a line
f1 = (s)=>{if(! temp) {
    temp = /(?:^\s*)(\d+)/.exec(s)
    temp = temp ? temp[1] : 0}
    }

en.requestString(null,te.untilPrompt("Press Return to continue:"))
en.requestString("",te.untilPrompt("-- "))
en.requestString("NYC",te.untilPrompt("exit:"),f1) //capture the digit of the temperature
en.requestString("",te.untilPrompt("menu:"))
en.requestString("",te.untilMilli(100))
    .then(()=>{if(temp % 2 == 0){return en.requestString("MIA",te.untilMilli(100))}
        else {return en.requestString("BOS",te.untilMilli(100))}})
    .catch(()=>{console.log("Something went wrong")})
    .finally(()=>{en.terminate();console.log("The temperature in NYC is",temp,"F")})
```

### Output
```
------------------------------------------------------------------------------
*               Welcome to THE WEATHER UNDERGROUND telnet service!            *
------------------------------------------------------------------------------
*                                                                            *
...
*                                       *
------------------------------------------------------------------------------
Press Return to continue:
Press Return for menu
or enter 3 letter forecast city code-- 
Weather Conditions at 03:51 PM EDT on 30 Apr 2020 for New York JFK, NY.
Temp(F)    Humidity(%)    Wind(mph)    Pressure(in)    Weather
========================================================================
  57          87%         SE at 29       29.95      Overcast
Forecast for New York, NY
328 PM EDT Thu Apr 30 2020
...Wind Advisory in effect until 8 PM EDT this evening...
.Tonight...Rain. Rain may be heavy at times. Windy with lows in
the lower 50s. Southeast winds 20 to 30 mph. Gusts up to 45 mph,
...
then partly cloudy after midnight. Lows in the lower 50s.
Northwest winds 15 to 20 mph. Chance of rain 50 percent. 
.Saturday...Mostly sunny. Highs around 70. Northwest winds 15 to
20 mph. 
   Press Return to continue, M to return to menu, X to exit: .Saturday night...Partly cloudy. Lows in the mid 50s. Northwest
winds 5 to 10 mph. 
.Sunday...Partly sunny. Highs in the upper 60s. 
...
.Wednesday...Mostly sunny. Highs around 60. 
.Wednesday night...Mostly cloudy. Lows in the mid 40s. 
.Thursday...Mostly sunny. Highs in the lower 60s. 
  Press Return for menu:
 
                         CITY FORECAST MENU
                ---------------------------------------------------
                1) Print forecast for selected city
                2) Print climatic data for selected city
                3) Display 3-letter city codes for a selected state
                4) Display all 2-letter state codes
                M) Return to main menu
                X) Exit program
                ?) Help
                   Selection:Weather Conditions at 03:54 PM EDT on 30 Apr 2020 for Boston, MA.
Temp(F)    Humidity(%)    Wind(mph)    Pressure(in)    Weather
========================================================================
  48          80%         ESE at 20       30.22      Overcast
Forecast for Boston, MA
415 PM EDT Thu Apr 30 2020
.Tonight...Cloudy. A chance of showers after midnight. Patchy fog
after midnight. Near steady temperature in the upper 40s.
Southeast winds 10 to 15 mph with gusts up to 25 mph. Chance of
rain 50 percent. 
.Friday...Showers, mainly in the morning. Patchy fog in the
...
Highs in the mid 60s. Northwest winds 10 to 15 mph with gusts up
to 30 mph. 
The temperature in NYC is 57 F
```
### Watch out!

Tracking the order of execution is somewhat tricky, and it is easy to make errors.  

It is important to remember some key principles:
- Engine methods place commands on the FIFO Engine queue.
- Commands are executed asynchronously at a later time, in the order they were placed in the queue.
- The code placed within a **then()**  is executed when the corresponding command is completed
- If a  **then()**  code includes a call to an Engine method, the corresponding command will be placed at the end of the execution queue. 
- If another level of **then/catch/finally** exists and is supposed to wait for the completion of a command, it is necessary that the **Promise** of generated by the engine method, i.e., **request()** be returned. 

Here are three easy errors
#### First easy error : test execute before engine command

Putting the test at the "first level" of code.
```
var te = require("telnet-engine")
var en = new te.Engine("rainmaker.wunderground.com",23)
var temp
en.listenString(console.log)
f1 = (s)=>{if(! temp) {
    temp = /(?:^\s*)(\d+)/.exec(s)
    temp = temp ? temp[1] : 0}
    }

en.requestString(null,te.untilPrompt("Press Return to continue:"))
en.requestString("",te.untilPrompt("-- "))
en.requestString("NYC",te.untilPrompt("exit:"),f1) //capture the digit of the temperature
en.requestString("",te.untilPrompt("menu:"))
en.requestString("",te.untilMilli(100))
if(temp % 2 == 0){en.requestString("MIA",te.untilMilli(100))}   // <------- PROBLEM
else {en.requestString("BOS",te.untilMilli(100))}
```
When the "first level" of code is executed  it places the first level of commands in the queue at once.  At that time the test ```if(temp % 2 == 0)``` is also executed but it is before any command is actually completed so the value of **temp** is indeterminate. 

The conclusion is that **Any logical branching dependant on the result of a request needs to be inserted in a then() construct***

####  Second easy error: not chaining subsequent commands

Following a **them/catch/finally** construct with first-level code. 

```
en.requestString("",te.untilMilli(100))
    .then(()=>{if(temp % 2 == 0){return en.requestString("MIA",te.untilMilli(100))}
        else {return en.requestString("BOS",te.untilMilli(100))}})
    .catch(()=>{console.log("Something went wrong")}
en.terminate()     // <------- PROBLEM
```
When this code is executed, the ```en.requestString("",console.log,te.untilMilli(100))``` enters the request on the engine queue, then ```en.terminate()``` is put in the queue. It is only at a later time that ```then(...)``` is executed and the conditonal request is put on the queue (behind the ```en.terminate()``` ) . As  result, the engine will be terminated before the contingent request is executed. 

In general **once a promise chain is started, all subsequent engine command needs to be added to the chain***

####  Third easy error: terminating a then() without returning a Promise
Make sure to return the Promise generated by an Engine method within a  **then()**  if the intent is to catch errors in the execution of the command or to wait for its resolution before moving to the next step in the chain. 
```
en.requestString("",te.untilMilli(100))
    .then(()=>{if(temp % 2 == 0){return en.requestString("MIA",te.untilMilli(100))}  // <--- LOOK HERE
        else {return en.requestString("BOS",te.untilMilli(100))}})             // <--- AND HERE
    .catch(()=>{console.log("Something went wrong")})
    .finally(()=>{en.terminate();console.log("The temperature in NYC is",temp,"F")})
```
If the **return** had been omitted, the code would still execute:  the **request** would be put on the queue; the **then()** would resolve immeditately and the execution would move to **finally()** , which would put the **terminate** command in the queue behind the **request**  command. The **catch()** would never be executed. 

However, the behavior is different when the **return**  is present. Now the **then()**  only resolves when the **request**  command is resolved. If it fails, the **catch()** is executed. And then only the  **finally()**  is executed.  It would make a big difference is data from the **request**  was used in the body for the **finally()**  or in any subsequent step in the chain. 

Note that when several commands are sequenced in the body of a **then()**, it is often OK to return only the last **Promise** because it is the last one in the execution queue and it will be resolved last.
```
en.requestString(...)
    .then(()=>{ en.requestString(...)
	        en.requestString(...)
		en.requestString(...)
		return en.requestString(...)})		
    .then(...
```


## Proxies

The use of **Promise** chains can solve many complex situations; however, it will lead to unpredictable results if the same Engine is received commands asynchronously from different parts of a program. In such a case, **then()** segments from different parts of the program might be interleaved, resulting in commands being mixed up in the queue with unpredictable results. 

One possible solution is to open several simultaneous connections with several instances of **Engine**s or to use semaphores to lock and release access. 

The module has a built-in mechanism to guarantee exclusive access to the Engine to one part of a program while queueing any request from another part. It is based on the use of **Proxies**. **Proxies** are "copies" of an existing engine. When a proxy is created, the queue of its parent Engine is frozen; the **Proxy** has its own queue, which is active. The parent continues to accept commands but queued for later execution. When the  ** Proxy** releases the parent, all the queued commands are executed in the order received. 
### Example 

The following example will query the server for the weather in **MIA** first and then **NYC** even though the requests for **NYC** are encountered first. 
```
te = require("telnet-engine")
var en = new te.Engine("rainmaker.wunderground.com",23)

en.listenString(console.log)
en.requestString(null,te.untilPrompt("Press Return to continue:"))
en.requestString("",te.untilPrompt("-- "))

//the following line creates a proxy and freezes the queue of en
var px = en.proxy()

//the following commands are queued by en
en.requestString("NYC",te.untilPrompt("exit:"))
en.requestString("",te.untilPrompt("menu:"))
en.requestString("",te.untilMilli(100))
en.terminate()

//the following commands are executed by px
px.requestString("MIA",te.untilPrompt("exit:"))
px.requestString("",te.untilPrompt("menu:"))
px.requestString("",te.untilMilli(100))
//this lines disables the proxy px and releases the queue of en
px.release()
```
### Details

The ** Proxy ()** method creates the Proxy immediately, but its queue is blocked until all previously queued commands in the parent's queue are completed.  In practice, the code that starts the queue of the **Proxy** is placed in the queue of the parent **Engine** and needs to make its way to the front of the queue before it is executed. In the meantime, commands are queued by the **Proxy**.

The **release()** method reactivates the queue of the parent, but not until all previously queued commands in the Proxy's queue are completed. In practice, the **release()** method places the command to release the queue of its parent in its own queue.

Also, a ** Proxy** exposes the properties of its parent **Engine**, but any changes made to those properties through the Proxy are reverted when the **Proxy** releases its parent. This feature can be useful if a server has multiple modes of operation using different line terminator, prompt, or perhaps the timing of the response. 

It is allowed to create a **Proxy** of a **Proxy**

Creating multiple  **Proxies** of an **Engine** is feasible. When a second **Proxy** of an **Engine** is created, the queue of the second ** Proxy** will remain inactive until the parent **Engine** queue is released by the first ** Proxy** and all commands that were queued by the parent before the creation of the second ** Proxy** are fulfilled. This is just a consequence that the command to start the queue of a proxy is placed in the queue of its parent.

Once a ** Proxy** releases its parent, it is disabled and should not be used anymore. 

The ** Proxy ()** method takes an optional timeout parameter; when the timeout expires, the **Proxy** automatically releases its parent and becomes disabled.  All pending commands in its queue are canceled.  This is a safety mechanism in the unlikely yet possible event of a hanged queue. 

# Reference

## ```new Engine(host,port)```
Engine constructor. 

| Parameters| Default|  |
| ------------- |-----|----|----
|**host**| |A string reprenseting an URL or an IP address 
|**port** |23|An integer
| ***return value***| |a telnet-engine object

Every time the Engine uses the connection, it first checks it is still up and, if necessary, attempts to reopen it. 

## ```Engine object properties```

The following engine properties are modifiable.

| Property|Type|<span>&nbsp;&nbsp;&nbsp;Default&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>| Role |
| ------------- |--------------|----|----
|```en.inDelimiter ```|RegEx|  **/\r\n\|\r\|\n/**| Terminator for incoming text
|```en.outDelimiter```|String|  **'\n'** | Terminator for outgoing text
|```en.openTimeout ```|Integer|  1500| Time in milliseconds that the Engine  waits before raising a timeout error when opening the communication
|```en.requestTimeout ```|Integer|  1500| Time in milliseconds that the Engine  waits before raising a timeout error after sending a request
|```en.clearOut ```|Integer|  0| Number of ms the Engine will wait to send a request after the last line of text received before 
|```en.defaultPrompt ```|String/RexExp|  /^$/| Default value for ```untilPrompt()```
|```en.modeStrict ```|Boolean|  true| In strict mode, received text is kept in the buffer and matched to the next request. If false, text received not in response to a request is not kept. 
|```en.autoLineBreak ```|false/Integer|  false| If an integer, the Engine will add a terminator to any unterminated line of text after waiting for that amount of ms. 
|```en.autoOpen ```|Boolean|  true| If true, the Engine opens/reopens the channel if needed when sending text. 
|```en.autoFlush ```|false/Integer|  false| If an integer, the Engine discards the first lines of text received just after opening or reopening the communication. The value is the wait time after the last text flushed and before terminating the flushing, 
|```en.openTries ```|Integer|  1| Number of times the Engine attempts to open the communication before it times out (the max elapsed time will be the number of attempts times the timeout value)


To maintain compatibility with previous versions, ```en.timeOut ```is also available, it changes both  ```en.requestTimeout ``` and ```en.openTimeout ``

## ```Engine events ```

The following methods establish a call back to a function **foo** every time a specific event occurs. They are only intended to create user information messages or indicatorsé 

| Event|Type|
| ------------- |--------------|
|```en.onConnecting(foo)```|foo is executed every time the engine attempts to open the connection|  
|```en.onConnectionSuccess(foo)```    |foo is executed every time the connection is successfully opened| 
|```en.onConnectionTimeOut(foo)```    |foo is executed if the connection is not established before time out. | 
| ```en.onConnectionError(foo)```    |foo is executed if some other error occurs| 
|  ```en.onConnectionEnd(foo)```        |foo is executed when the engine closes the connection| 
|  ```en.onResponseTimeOut (foo)```    |foo is executed if a request to the server times out| 
| ```en.onReceive(foo) ```    |foo is executed when a line is received| 

with:
| Parameters|  |
| ------------- |-----|----|----
|**en**| Engine object 
|**f**| Function of the form: ```()=>{...}```
| ***return value***| Defer object from the npm module repeat-promise.

The call back can be disabled with the method ```df.terminate()``` of the returned Defer object.

## ```en.terminate()```

This is the soft termination method of an **Engine**. It closes the socket to the telnet server and disables all call-backs. This method is queued by the Engine; so all pending commands are completed first. 

## ```en.detroy()```

This is the hard termination method of an **Engine**.  It immediately closes the socket to the telnet server and disables all call-backs. This method is the synchronous version of ```en.terminate()```. 

## ```en.listenString(foo,UID)```

Establishes a call back to **foo** every time a line of text is received from the server.

| Parameter| Type | Default   |  |
| ------------- |---- |------|------
|**en**|Engine 
| **foo** |```(s)=>{...}``` |n/a|Function called with each incoming line of text 
| **UID**|Object/String/Number|undefined| Optional tag indentifying a specific Request. If provided, only the corresponding response lines will be processed by **foo**
| ***return value***| Defer|| object from the npm module repeat-promise

The call-back can be disabled by calling the **df.terminate()** method of the **Defer** object returned by **listenString** (See **Defer** and **Cycle** documentation for more details).  The call-back is automatically disabled when the **Engine** is terminated.

Note that  **listenString**  is not placed in the Engine queue and that the call-backs to **foo** are not synchronized with the execution of the queue.  As a result, a program should not rely on the order of appearance of **listenString**   in the program with respect to other Engine methods.

## ```en.listen(foo)```

This is an object version ```en.listenString(foo,UID)```.  It establishes a call back to **foo** every time a line of text is received from the server, but the line is provided as an object.

| Parameter| Type | Default   |  |
| ------------- |---- |------|------
|**en**|Engine 
| **foo** |```(obj)=>{...}``` |n/a|Function called with each incoming line of text *
| ***return value***| Defer|| object from the npm module repeat-promise

The object **obj** is passed to the call-back function **foo**. See the description of the method  ```Request()```for the details of the object properties.

The call-back can be disabled by calling the **df.terminate()** method of the **Defer** object returned by **listen** (See **Defer** and **Cycle** documentation for more details). The call-back is automatically disabled when the **Engine** is terminated.

Note that  **listen**  is not placed in the Engine queue and that the call-backs to **foo** are not synchronized with the execution of the queue.  As a result, a program should not rely on the order of appearance of **listen**   in the program with respect to other Engine methods.


## ```en.echoString(foo)```

Establishes a call back to **foo** every time a line of text is sent to the server.

| Parameter| Type | Default   |  |
| ------------- |---- |------|------
|**en**|Engine 
| **foo** |```(s)=>{...}``` |n/a|Function called with each outgoing line of text 
| ***return value***| Defer|| object from the npm module repeat-promise

The call-back can be disabled by calling the **df.terminate()** method of the **Defer** object returned by **listen** (See **Defer** and **Cycle** documentation for more details). The call-back is automatically disabled when the **Engine** is terminated.

Note that  **echoString**  is not placed in the Engine queue and that the call-backs to **foo** are not synchronized with the execution of the queue.  As a result, a program should not rely on the order of appearance of **echoString**   in the program with respect to other Engine methods.

## ```en.echo(foo)```

This is an object version ```en.echoString(foo)```.  It establishes a call back to **foo** every time a line of text is sent from the server, but the line is provided as an object.

| Parameter| Type | Default   |  |
| ------------- |---- |------|------
|**en**|Engine 
| **foo** |```(obj)=>{...}``` |n/a|Function called with each incoming line of text *
| ***return value***| Defer|| object from the npm module repeat-promise

The object **obj** has the following properties:

| Properties| Type   | |
| ------------- |---- |----
| **request**|String  |Line of text sent to the server
| **UID**| Object/String/Number|Object, string or number identifying the request to the server

The call-back can be disabled by calling the **df.terminate()** method of the **Defer** object returned by **listen** (See **Defer** and **Cycle** documentation for more details). The call-back is automatically disabled when the **Engine** is terminated.

Note that  **echo**  is not placed in the Engine queue and that the call-backs to **foo** are not synchronized with the execution of the queue.  As a result, a program should not rely on the order of appearance of **echo**   in the program with respect to other Engine methods.


## ```en.requestString(text,test,foo,UID)```

The asynchronous method  ```en.requestString() ``` works by placing a  command to send one line of text on the Engine queue and then wait for it is execution and for a complete response from the server. 

| Parameter| Type | Default   |  |
| ------------- |---- |------|------
|**en**|Engine  ||
| **request** |String|**undefined** |Line of text to be sent or **undefined** 
| **test** |Function|```te.oneLine()```    |Test function detecting the end of the response (usually created by a test function generator) 
| **foo** |```(s)=>{...}```|**undefined**|Function for processing each line of text received
| **UID**|Object/String/Number|undefined| Optional tag indentifying a specific Request. If provided, only the corresponding response lines will be processed by **foo**** |
| ***return value***| Promise | |Resolves to an array of Strings representing each line of text received or to an array of the result of apply **foo** to them. 

All the parameters are optional.

If **request**  is  **undefined**, no text will be sent, but the incoming text will be processed. 

In general, there is no need to write a custom test function; the module provides a set of test function generators that cover most of the use cases. 

The call-back function **foo** is optional; if it is present, the Promise will resolve to the array of values resulting from calling  **foo** with each line of the response. 

The **request()** method returns a Promise that resolves when the response is complete or is rejected in case of failure. The **then/catch/finally** construct can be used to handle these situations.

### Test function generators

The following test function generators are includes in the module. Generators are functions that return a custom test function based on the input parameter; they take care of the implementation details.  It is the test function that needs to be passed to the request, not the generator. 

| Generator| Use 
| ------------- |----
|```te.untilString(s)```    |        The last line of the response contains the string s
|```te.untilRegEx(r)```    |        The last line of the response contains the regular expression r
|```untilPrompt(s)```    |          Until the prompt **s** appears in an unterminated response
|```te.untilNumLines(n)```|        The response contains n lines
|```te.untilMilli(t)```    |        The reponse is complete if no message has been received in the last t milliseconds. 
|```te.oneLine()```    |            The response contains one line (default)
|```te.noResponse()```    |            No response expected
|```te.untilTrue(f)```    |     This is a generic generator.  **f** is an arbitrary test function, it should accept a line of text and return **true** if it detects the last line of a response.

if omitted, ```te.oneLine()``` is the default. 

### Custom test funtion

It is possible (but probably rarely needed) to program a completely custom end of response test function. 
Such a function needs to be in the form: ```(s,fun,obj) =>{...}```
Parameter| Type | |  
| ------------- |---- |------
|**s**|String|A line of text received
| **fun** |Function|A function provided by the Engine, which should be called if the last line of text is detected 
| **obj** |Object|A "context" object that is passed (the same object) to every call related to one specific request. The test function can use the properties of this object to store data between calls if needed. A fresh object is created with every new request. 

For more details, look at the implementation of the generators in the source available on Github.

## ```en.request(req)```


This is an object version of ```en.requestString() ```, it takes and returns lines of a response as objects. This version allows for finer processing of responses.


| Parameter| Type | Default   |  |
| ------------- |---- |------|------
|**en**|Engine  ||
| **req** |Object||Object with properties defined the behavior of the request  |
| ***return value***| Promise | |Resolves to an array of objects representing each line of text received or to an array of the result of apply **foo** to them. 

### Example
``` 
var te = require("telnet-engine")
var en = new te.Engine("rainmaker.wunderground.com",23)
en.request({request: "", test:te.untilMilli(100), 
        foo: (obj)=>{return obj.response.length}, 
        UID: "REQ123"} )
    .then(console.log)
    .catch(()=>{console.log("error:","REQ123")})
```
###  Output
``` 
[
  78, 79, 78, 78, 78, 78,
  78, 78, 78, 78, 78, 78,
  78,  0, 25, 21
]
``` 
### Input object properties

The expected properties of the **req** object are similar to the parameters of ```en.requestString() ```

| Property| Type |   |
| ------------- |---- |------|------
| **request** |String|Line of text to be sent or **undefined** 
| **test** |Function||Test function detecting the end of the response (usually created by a test function generator) 
| **foo** |```(s)=>{...}```|Function for processing each line of text received
| **UID**|Object/String/Number| Optional tag indentifying a specific Request. If provided, only the corresponding response lines will be processed by **foo**** |


### Output object properties

The information the returned objects carry is more detailed than that available from ```en.requestString() ```

| Properties| Type   | |
| ------------- |---- |----
| **response**|String  |Line of text received from the server
| **UID**| Object/String/Number|Object, string or number identifying the request to the server
| **count**| Integer|Numeric order of the line in the response (starts at 1)
| **request**|String  |Text of the request
| **terminator**|String  |Characters detected as terminator
| **prompt**|String  |Characters detected as prompt
| **end**|**undefined**/**true**|**true** if last line of a request
| **delayed**|**undefined**/**true**|Indicates it is an extra object with no text content  generated by the end of response timer in the case of ```te.untilMilli(t)```. 
| **fail**|**undefined**/**true**|**true** fi the request timed out 

The same output objects are sent to the call-back function of ```en.listen(foo)``` 

There is one small complexity when the test function is generated by  ```te.untilMilli(t)```. The **Engine** has to wait after the last line of text to determine that the response is complete. Consequently, the object corresponding to the last line of text doesn't have its **end** property set to **true**. However, one extra object is generated upon detection of the end, this object has no **response** property, but it has its **end** property set to **true**. It also has a **delayed** property set to **true**, indicating it is a delayed end of response. The call-back functions of```en.request() ``` and  ```en.listen()```  both receive this extra object however it is not included in the array passed by the resolved promise of ```en.request() ``` .



## ```en.proxy()```

The **Proxy ()** method creates a copy of the **Engine** or a copy of another **Proxy**.  The creation of the **Proxy** freezes the queue of the parent ** Engine** or **Proxy**, thus gaining exclusive access to the websocket. 


| Method| Return Type | |  
| ------------- |---- |---- 
|  ```en.proxy()``` | Proxy |Creates the **Proxy** and freezes the parent's queue.
|  ```en.release()```|  Promise| Releases the parents queue and disables the **Proxy**
|  ```en.proxy(t)``` | Proxy |**t** is optional and sets a "safety" timer that automatically releases the **Proxy** after t milliseconds.

The start, freezing or restart of the queue of the parent or of the child is always queued so commands on that queue are can complete before the queue changes status. 

A **Proxy** exposes all the same methods as an **Engine** except ```terminate()``` and  ```destroy()```, which are not available on the **Proxie**s. 

Changes to the **Engine** properties through the **Proxy** properties are possible, and these changes are reverted when the **Proxy** is released. 

## ```en.open()```

Opens the communication. It is usually unnecessary as the communication is automatically opened/reopened when sending text, flushing etc ...

## ```en.wait(t)```

Stops the execution queue of the **Engine** for t milliseconds.  This command is queued, so all previously queued commands are executed first. The method returns a **Promise** that is resolved when the queue restarts.  


## ```en.do(foo)```

Puts the execution of **foo** on the execution queue of the **Engine**. The method returns a **Promise** that is resolved when **foo** is completed. 