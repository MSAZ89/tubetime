use svelte 5, typescript, tailwind css for all edits - do not over-ride my styling or change my variable names.

here is the svelte 5 new runes mode which you should also use at all times: $state
On this page
$state
$state.raw
$state.snapshot
Passing state into functions
Passing state across modules
The $state rune allows you to create reactive state, which means that your UI reacts when it changes.

<script>
	let count = $state(0);
</script>

<button onclick={() => count++}>
clicks: {count}
</button>
Unlike other frameworks you may have encountered, there is no API for interacting with state — count is just a number, rather than an object or a function, and you can update it like you would update any other variable.

Deep state
If $state is used with an array or a simple object, the result is a deeply reactive state proxy. Proxies allow Svelte to run code when you read or write properties, including via methods like array.push(...), triggering granular updates.

State is proxified recursively until Svelte finds something other than an array or simple object (like a class or an object created with Object.create). In a case like this...

let todos = $state([
{
done: false,
text: 'add more todos'
}
]);
...modifying an individual todo’s property will trigger updates to anything in your UI that depends on that specific property:

todos[0].done = !todos[0].done;
If you push a new object to the array, it will also be proxified:

todos.push({
done: false,
text: 'eat lunch'
});
When you update properties of proxies, the original object is not mutated. If you need to use your own proxy handlers in a state proxy, you should wrap the object after wrapping it in $state.

Note that if you destructure a reactive value, the references are not reactive — as in normal JavaScript, they are evaluated at the point of destructuring:

let { done, text } = todos[0];

// this will not affect the value of `done`
todos[0].done = !todos[0].done;

$derived
On this page
$derived
$derived.by
Understanding dependencies
Overriding derived values
Deriveds and reactivity
Destructuring
Update propagation
Derived state is declared with the $derived rune:

<script>
	let count = $state(0);
	let doubled = $derived(count * 2);
</script>

<button onclick={() => count++}>
{doubled}
</button>

<p>{count} doubled is {doubled}</p>
The expression inside $derived(...) should be free of side-effects. Svelte will disallow state changes (e.g. count++) inside derived expressions.

As with $state, you can mark class fields as $derived.

Code in Svelte components is only executed once at creation. Without the $derived rune, doubled would maintain its original value even when count changes.

$effect
On this page
$effect
$effect.pre
$effect.tracking
$effect.pending
$effect.root
When not to use $effect
Effects are functions that run when state updates, and can be used for things like calling third-party libraries, drawing on <canvas> elements, or making network requests. They only run in the browser, not during server-side rendering.

Generally speaking, you should not update state inside effects, as it will make code more convoluted and will often lead to never-ending update cycles. If you find yourself doing so, see when not to use $effect to learn about alternative approaches.

You can create an effect with the $effect rune (demo):

<script>
	let size = $state(50);
	let color = $state('#ff3e00');

	let canvas;

	$effect(() => {
		const context = canvas.getContext('2d');
		context.clearRect(0, 0, canvas.width, canvas.height);

		// this will re-run whenever `color` or `size` change
		context.fillStyle = color;
		context.fillRect(0, 0, size, size);
	});
</script>

<canvas bind:this={canvas} width="100" height="100"></canvas>
When Svelte runs an effect function, it tracks which pieces of state (and derived state) are accessed (unless accessed inside untrack), and re-runs the function when that state later changes.

$props
On this page
$props
Fallback values
Renaming props
Rest props
Updating props
Type safety
$props.id()
The inputs to a component are referred to as props, which is short for properties. You pass props to components just like you pass attributes to elements:

App

<script lang="ts">
	import MyComponent from './MyComponent.svelte';
</script>

<MyComponent adjective="cool" />
On the other side, inside MyComponent.svelte, we can receive props with the $props rune...

MyComponent

<script lang="ts">
	let props = $props();
</script>

<p>this component is {props.adjective}</p>
...though more commonly, you’ll destructure your props:

MyComponent

<script lang="ts">
	let { adjective } = $props();
</script>

<p>this component is {adjective}</p>
Fallback values
Destructuring allows us to declare fallback values, which are used if the parent component does not set a given prop (or the value is undefined):

let { adjective = 'happy' } = $props();
