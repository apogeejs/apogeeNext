# Apogee

Apogee is a reactive javascript IDE and runtime. Apogee allows only a small number of top level statements
in the code files. Mainly, the code consists of field definitions. This is something like a
variable declaration except the field is immutable. Also, the order of these field definitions does
not matter. That is because the runtime orders the statements based on the dependencies in the statements.

## Field Definitions

Here is an example, showing a couple of field definitions.

```

y := x + 2

x := 34

```

The operator ":=" is the definition operator. It gets its name because it defines the value of the associated field,
after which it is immutable (ie, you can not modify it from other code). Above we define y as x + 2. Then we define
x as 34. The result of this is that x will be 34 and y will be 36.

The left side of the definition is the field name. The right side of the definition is a function body whose return
value gives the field value. In the above example the function body is given in a format similar to an arrow function,
where the return value of the function body is the value of the expression. Alternately, the function body can also be
expressed using a code block, just as with an arrow function.

```

z := {
    return Math.PI
}

```

## Data Fields and Function Fields

Above we defined fields whose value is the return value of a function. These are called data fields. Note that the value 
of a data field can be a function. The key point is that they are the return value of the given function body.

A function field is one whose value is the function given by the function body itself. These must have an argument list, which
may be empty. Function fields can be written in two ways, as an arrow function or as a "regular" function definition, but without
the function keyword.

```

foo := () => 34

goo := (x,y) {
    return 34 + x + y
}

```

## Imports

In a code file, "import" statements are also allowed. The imported file can be either a standard ES module, which can be loaded 
from npm, or a reactive javascript file from the local file system.

(For the time being, all fields in the reactive javascript file are exported. Maybe we will add a private keyword, or something 
like that to restrict what is exported.)

## Project

(This needs to be written up): 
- The project has settings which define the top level file (in the future, we will allow multiple top level files)
- Other files in the project can be imported using relative file paths
- The project also has dependencies, as with a node project.json file. These dependencies can be imported by name.

## User Interface

(write this up):
- React can be used to make react elements.
- A html file is also defined, in the project settings.
- The html file displays a top level react element. As with other variable, which updates as you write the code.

## Immutability and Interactions

(write this up):
- Apogee fields are "immutable". However, is something is truly immutable, it can't do anythng interesting. For example,
 you can not give any input with a user interface.
- There is a way to change the value of an apogee field. For one, you can edit the code. As mentioned above, this causes
a recalculation.
- There is another way to modify the code by using something called the messenger. This violates immutability the same
way that editing code violates immutability. It is in a sense editing the code.
- There is a special provision for this however. When using the messenger, you can only modify "transient" fields.
- A transient field is defined as below.

```

myTransientVariable :~ 34

```

- The rules for this definition is that it can have no depedendencies, other than constants (shown below). This can be though
of as an initializer. The value can then be modified by calling the messenger. Here we display using the messenger in a 
react element.

```
//This is a constant
const INITIAL_COUNT = 34

//This is a transient field. It can have no dependencies, other than constants
buttonCount := INITIAL_COUNT

//This is a simple react element that uses the messener to update the state in our model.
<CounterButton> = () {

  const handleButtonClick = () => {
    postMsg("buttonCount",buttonCount+1)
  };

  return (
    <button onClick={handleButtonClick}>
      Click me! Count: {buttonCount}
    </button>
  );
};

```

Our code above demonstrates including a react element. Note that we wrote it with the arrow brackets. We can give more
information on why it does that later. For now, just remember to do it. Note that we can still use react hooks in our
element. You may, or may not, want to do this to hold internal state in the element. However, if you want to send the 
state elsewhere in the app, you can use the messenger, the "postMsg" function.

The messenger essentially takes the action of editing the code so, in this case, "buttonCount" gets a new value. (However,
the document doesn't actually change.) In this sense, we recalculate the state of our model.

A way to view this is that the field definitions define the value of a field in this model, period. We can go in and edit
out model, such as changing the initial value of buttonCount, or we can modify the button count with the messenger. In either
case we create a new model. At this point, all the values in the model are updated so the field definitions are true.

In our example above. the CounterButton field is updated because it depends on buttonCount.

You can think of this sort of like a spreadsheet. When you update one cell in your spreadsheet, the other values automatically 
update, as needed.

The code above also illustrates defining a constant. Note that this just uses a normal equal sign. It can not be dependent on
fields that can change value.

## Circular Reference Error

To continue the spreadsheed analogy, there is a problem if there is a circular reference. This is an error.

```
 //CIRCULAR ERROR!
 x := y^2
 y := x - 2

 ```

 The code above gives an error. Algebraicly there is an answer, x=4 and y=2 is one. However, the program is not smart enough to 
 figure that out. So don't do that.

 You can however call functions recursively. This is technically a circular reference, but it is smart enough to figure out when
 that is not a problem.

 ## Pure Side Effect Code

There is another elemet we can write in our code. This is the pure side effect code. I know we said we did not allow side effects.
By that we meant we couldn't change the value of a field externally. Well, aside from using the messenger. We can also do the 
following:

```

x := 45

{
    console.log(x)
    return x
}

```

In this code we define a field x and we also have a code block, which is actually a function body. This function body behaves just like 
a variable definition except it does not assign its output value anywhere. However, this value will be displayed to the user by the
editor (which we did not show here). Also, we can put other external side effects in the code. Here we also print to the console.

This block is useful for examining the code or even running things like unit tests as you code.




