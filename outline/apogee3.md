# Apogee

Apogee is a reactive JavaScript IDE and runtime that introduces a unique approach to coding. Rather than writing traditional lines of code, Apogee allows you to define field values, similar to a system of equations. The runtime then automatically calculates the values of all the fields, determining the calculation order internally based on the dependencies in each field.

## Field Definitions

In Apogee, field definitions are used to define variables or constants. The `:=` operator is used to assign a value to a field. It's important to note that fields in Apogee are immutable, meaning their values cannot be modified after assignment. The order of field definitions doesn't matter because the runtime automatically resolves dependencies among the fields.

Here's an example of field definitions:

```javascript
y := x + 2
x := 34
```

In this example, we define `y` as the sum of `x` and 2, and `x` as 34. As a result, `x` will have a value of 34, and `y` will have a value of 36.

The left side of the definition represents the field name, while the right side is a function body that calculates the field value. The function body can be written as an arrow function or a code block.

```javascript
z := {
    return Math.PI
}
```

## Data Fields and Function Fields

Apogee supports two types of fields: data fields and function fields.

Data fields are fields whose values are computed by a function. These values can be any JavaScript value, including functions. The value of a data field is determined by the return value of the function body.

Function fields, on the other hand, have values that are the functions themselves. Function fields must have an argument list, which can be empty. They can be written as arrow functions or as "regular" function definitions without the `function` keyword.

```javascript
foo := () => 34

goo := (x, y) => {
    return 34 + x + y
}
```

## Transient Fields and the Messenger

In addition to data fields and function fields, Apogee introduces a field type called "transient" fields. Transient fields are defined using the ":~" operator, as shown below:

```
myTransientField :~ 34

myOtherTransientField :~ {
    return 34
}
```

Transient fields are similar to data fields, but with two differences. First they cannot depend on other fields. The definition can be thought of as being an "initial condition" value. Second, their values can be modified using the "messenger".

The messenger is a mechanism that allows for updating the values of transient fields. It lets you set a new value on a field, but it does it  asynchronously, after our original model is updated. Essentially, it starts the calculation over with a new model after the old calculation finishes.

Here's an example that demonstrates the usage of a transient field and the messenger:

```javascript
x :~ 0
y := x + 2
z := {
    if (x < 10) {
        console.log("x is now: " + x)
        let newX = x + 1
        postMsg("x", newX) // The messenger updates the value of x
    }
    return 5
}
```

In this example, the initial value of `x` is set to 0. The fields `y` and `z` are then calculated based on the value of `x`. When `z` is calculated, it uses the messenger to update the value of `x`. However, this update doesn't immediately affect the current model.

Once the initial model calculation is complete, the messenger runs and updates the value of `x`, creating a new model based on the field definitions, with the "new" value of `x`.

When the dust settles, we have the following values:

- `x` = 10
- `y` = 12
- `z` = 5

Additionally, 10 messages are printed to the console, showing the progression of `x` from 0 to 9.

It's important to note that despite these updates, the values of the fields are not being modified while the value calculation is done. We can view the values as immutable. Then after the calculaton, the update occurs, essentially creating a new system of equations to solve. 

//////////////////////////////////////////////////////
/////////////////////////////////////////////

// Iterative approach to factorial using the messenger
// I don't necesssarily recommend this over doing it recursively. It is just an example.
// It is slower since it is going though a more cumbersome calculation process, but one
// benfit is that it does not create a large call stack. (Granted, with tail recursion
// you can usually avoid that with recusrive calls to. But there might be a case this is useful.) 
// I think the stronger use case for this is calls from a user interface. It is also required
// I think when you want to accumulate data, as in a history. As is, apogee can not self reference
// a field, such as doing something like x = x + 1 without the messenger. What this means is it can be used to resolve
// what would otherwise be a circular reference.
//NOTE - we should add more info, including the compound value show message used below:

target := 5
n :~ 1
nm1Fact = :~ 1
nFact := {
	let result = n * nm1Fact
	if(n < target) {
		postMsg(["n",n+1],["nm1Fact",result]])
	}
	else if(n > target) {
		postMsg([["n",1],["nm1Fact",1]])
	}
	return result
}

// aside: recursive approach in apogee (not described below)
n := 5
nf := factorial(5)
factorial := (n) => (n <= 1) ? 1 : n * nFact(n-1)


//chatgpt didn't create this, but I did have it explain it

The code snippet provided calculates the factorial of a target number using the messenger approach in Apogee. Here's an explanation of how it works:

1. We define a data field `target` with a value of 5, representing the number for which we want to calculate the factorial.
2. We define a transient field `n` with an initial value of 1, which serves as a counter for the factorial calculation.
3. We define a transient field `nm1Fact` with an initial value of 1, representing the factorial of `n - 1`.
4. We define a function field `nFact` that calculates the factorial of `n`.
5. Inside the `nFact` function, we multiply the value of `n` with the value of `nm1Fact` to calculate the factorial result.
6. If `n` is less than the `target` number, we use the `postMsg` function to update the value of `n` to `n + 1` and update the value of `nm1Fact` to `result`.
7. If `n` is greater than the `target` number, we reset the value of `n` to 1 and `nm1Fact` to 1.
8. Finally, we return the calculated factorial result.
9. The use of the `postMsg` function triggers the recalculation of the model with the updated values of `n` and `nm1Fact`, allowing the factorial calculation to progress iteratively.

After executing this code in Apogee, the `nFact` field will hold the calculated factorial value based on the `target` number. The factorial calculation is performed step-by-step, incrementing the value of `n` and updating `nm1Fact` using the `postMsg` function until the desired `target` is reached.

///////////////////////////////////////////////////
////////////////////////////////////////////////////
/////////////////////////////////////////////////////
NEED TO REWRITE BELOW!!! (itis a bunchof leftover text now)

/////////////////////////////////////////////////////////////////////////



## User Interface Elements

In the Apogee framework, React can be used to create React elements and build user interfaces. The project settings include an HTML file that displays a top-level React element. As you write code, the displayed React element updates accordingly.

Before we try react code, there is one more type of field we need to add, a "transient" field. it has the following syntax.



The rules for defining a transient field are that it can have no dependencies other than constants. It gets the name transient because we can
change its value from code. We'll talk more about what this means below. First, we will show its use together with some react code.

In this example we create a react element that stores its state in a  

```
// This is a constant
const INITIAL_COUNT = 34

// This is a transient field. It can have no dependencies other than constants
buttonCount :~ INITIAL_COUNT

// This is a simple React element that uses the messenger to update the state in our model.
<CounterButton> := () {

  const handleButtonClick = () => {
    //The messenger!
    postMsg("buttonCount", buttonCount + 1)
  };

  return (
    <button onClick={handleButtonClick}>
      Click me! Count: {buttonCount}
    </button>
  );
};
```

In the example above, the React element `<CounterButton>` utilizes the messenger to update the state in our model. When the button is clicked, the `postMsg` function is called, modifying the value of the `buttonCount` field. This triggers a recalculation of the model's state, updating all field values accordingly.

To understand the idea of immutable fields and the idea of the messenger in Apogee, thin 

This spreadsheet-like behavior ensures that when you update one field, other dependent fields automatically update as well.

It's worth noting that Apogee supports defining constants using a normal equal sign. Constants cannot depend on fields that can change their value dynamically.

//////////////////////////////////////////////////
// DOH! for react, we really want something like this:
// HERE, WE PASS IN THE NAME OF THE FIELD TO USE FOR STATE, SO WE CAN CREATE MULTIPLE BUTTONS.
// getVal is used to read the value. 

```
// This is a constant
const INITIAL_COUNT = 34

// This is a transient field. It can have no dependencies other than constants
buttonCount :~ INITIAL_COUNT

// This is a simple React element that uses the messenger to update the state in our model.
<CounterButton> := ({count,countStateName}) {

  const handleButtonClick = () => {
    //The messenger!
    postMsg(countStateName, count + 1)
  };

  return (
    <button onClick={handleButtonClick}>
      Click me! Count: {count}
    </button>
  );
};

//Here we create a button with the state stored in buttonCount
{
    return <CounterButton count={buttonCount}, countStateName="buttonCount" />
}
```


///////////////////////////////////////////////////////

## Circular Reference Error

While Apogee supports recursive function calls, circular references among fields lead to a circular reference error. Let's consider the following example:

```javascript
// CIRCULAR ERROR!
x := y^2
y := x - 2
```

In this code, `x` is defined as `y` squared, and `y` is defined as `x` minus 2. Although there is a valid algebraic solution (x = 4, y = 2), the program is not capable of inferring this relationship. Therefore, circular references of this nature should be avoided to prevent circular reference errors.

However, it's important to note that recursive function calls are still allowed in Apogee. Although they technically create a circular reference, the framework can handle recursive calls intelligently and determine when they do not result in circular dependencies.

## Pure Side Effect Code

In Apogee, there is an additional element called "pure side effect code." While it was mentioned earlier that side effects are not allowed, this specifically referred to external changes to field values. However, pure side effect code allows for


```
///////////////////////////////////////////////////////////////////////////////
```

In Apogee, there is an additional element called "pure side effect code" that allows for executing code with side effects within the code file. While Apogee primarily focuses on immutability and reactive behavior, pure side effect code provides a way to perform actions such as logging or running unit tests.

Here's an example of pure side effect code:

```javascript
x := 45

{
    console.log(x)
    return x
}
```

In the code above, we define a field `x` and include a code block, which serves as a function body. This code block behaves similarly to a variable definition, but it doesn't assign its output value to any field. However, the value returned from the code block will be displayed to the user by the editor (not shown here). Additionally, you can include other external side effects within the code block, such as printing to the console.

The purpose of pure side effect code is to enable code examination or the execution of tests as you develop your application.

Please note that while pure side effect code allows for side effects within the code file, it's important to keep in mind that the primary focus of Apogee is on immutability and reactive behavior. Side effects should be used judiciously and with a clear purpose to maintain the benefits of a reactive programming approach.