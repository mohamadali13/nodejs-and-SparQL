# simple-memory-store
ES6 module for providing a simple interface to a kind of database (only in memory) to be used for training/lectures (not productivity).
Objects stored are identified by `.id` attribute, which is automatically set and 
incremented (starting with `100`) over all collections (called types). 
On `insert(..)` operation `.id` must not be set (and will be added by the insert method).

__This simple-memory-store is not intended to be used for production use, but only for training or lecture purposes!__
 
 # Usage
 `const store = new (require('simple-memory-store'))();`
 
 `require(..)` will return the ES6 class `Store`, which you need to create an instance from. Constructor has no parameters. 
 
 # methods exposed as public
 - `select (String type, Number id = undefined)` @returns undefined, copy of one element or array of copied elements, if `id` is omitted
 - `insert (String type, Object element)` @returns the new element as a copy with set `.id` attribute
 - `replace (String type, Number id, Object element)` @returns the former object stored before
 - `remove (String type, Number id)` @returns the former object stored before
 
 __All methods throw Errors if something went wrong.__
 
 Elements stored in store are expected to have an `.id` property with a numeric value > 0 (except on `insert(..)`)
 
 