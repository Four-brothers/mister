
// var assert = require('assert');
import { collections } from ".";
import { math } from "..";

const enum Compare {
  less = -1,
  equal = 0,
  greater = 1
}

class Node<K,V> extends collections.MapEntry<K, V> {
  ptrs: Array<Node<K,V>>;

  constructor(key: K, value: V, level: u32){
    super(key, value);
    this.ptrs = new Array<Node<K,V>>(level);
  }

  equals(other: Node<K,V>): boolean {
    return encode(this) == encode(other);
  }

  forward(i: u32): Node<K,V> {
    return this.ptrs[i];
  }

  peek(i: u32): K {
    return this.ptrs[i].key;
  }

  set(i: u32, node: Node<K,V>): void {
    this.ptrs[i] = node;
  }

  // read(level: u32): Node<K,V> {
  //   return 
  // }

  compare(other: Node<K,V>): Compare {
    if (this.key < other.key) return Compare.less;
    if (this.key == other.key) return Compare.equal;
    return Compare.greater;
  }
}



function allocate<T>(): T {
  return changetype<T>(__alloc(offsetof<T>(), idof<T>()));
}

export class RNG<T> {
  private buffer: Uint8Array;
  private index: i32 = 0;
  private tripsAround: u32 = 0;

  constructor(len: u32, public max: u32 = 10_000){
    if (!isInteger<T>()) {
      throw new Error("Only Integer types can be created");
    }
    let real_len = len * sizeof<T>();
    this.buffer = math.randomBuffer(real_len);
  }
  
  next(): T {
    if (this.index * sizeof<T>() >= this.buffer.length) {
      this.tripsAround++;
      if (this.tripsAround == sizeof<T>()) {
        math.randomBuffer(this.buffer.length, this.buffer);
        this.index = 0;
        this.tripsAround = 0;
      } else {
        this.index = this.tripsAround;
      }
    }
    const index = this.index;
    this.index += sizeof<T>();
    //@ts-ignore
    return <T>(load<T>(this.buffer.dataStart + index) % this.max);
  }
}
	
const FACTOR: u64 = 10_000;

const ETimes10e10: u64 = 27183;


export function lessThanE(rng: RNG<u64>): bool {
  let low = rng.next();
  let high = (FACTOR * FACTOR) / ETimes10e10;
  return low < high;
}


// var P = 1 / Math.E;

export class SkipList<K,V> {
  /** Empty Node */
  private readonly NIL: Node<K, V> = allocate<Node<K,V>>();
  level: u32 = 1;
  private rng: RNG<u64> = new RNG<u64>(100, <u32>FACTOR);
  tail: Node<K,V>;
  head: Node<K,V>;
  private _update: Array<Node<K,V>>;
  private readonly maxLevel: u32;

  constructor(maxSize: u32 = 65535) {
    let NIL = allocate<Node<K, V>>();
    this.head = allocate<Node<K, V>>();
    this._update = new Array<Node<K,V>>(maxSize);
    const key = NIL.key;
    const NILPtr = changetype<usize>(NIL);
    this.tail = NIL;
    this.maxLevel = math.binaryLog(maxSize);
    let nilKey: K;
    if (isString<K>()) {
      store<string>(NILPtr, 0xFFFF);
      //@ts-ignore
      this.tail.key = <K>String.fromCodePoint(0xFFFF);
      log(this.tail.key)
    } else if (isReference<K>()){
      store<usize>(NILPtr, Usize.MAX_VALUE())
    } else if (key instanceof u64) {
      store<u64>(NILPtr, U64.MAX_VALUE);
    } else if (key instanceof i64) {
      store<i64>(NILPtr, I64.MAX_VALUE);
    } else if (key instanceof u32) {
      store<u32>(NILPtr, U32.MAX_VALUE);
    } else if (key instanceof i32) {
      store<i32>(NILPtr, I32.MAX_VALUE);
    } else if (key instanceof u16) {
      store<u16>(NILPtr, U16.MAX_VALUE);
    } else if (key instanceof i16) {
      store<i16>(NILPtr, I16.MAX_VALUE);
    } else if (key instanceof u8) {
      store<u8>(NILPtr, U8.MAX_VALUE);
    } else if (key instanceof i8) {
      store<i8>(NILPtr, I8.MAX_VALUE);
    }
    this._update.fill(this.head);
    this.head.ptrs = new Array<Node<K,V>>(this.maxLevel);
    this.head.ptrs.fill(<Node<K,V>>this.tail);
  }

  set(key: K, value: V): void {
    let node = this.head;
    for (let i: i32 = <i32>this.level - 1; i >= 0; i--) {
      while (node.peek(i) < key) {
        node = node.forward(i);
      }
      this._update[i] = node;
    }
    if (node.key == key) {
      node.value = value;
    } else {
      let newLevel: u32 = this.randomLvl();
      if (newLevel > this.level) {
        this._update.fill(this.head, this.level, newLevel);
        this.level = newLevel;
      }
      node = new Node<K, V>(key, value, newLevel);
      for (let i: u32 = 0; i < newLevel; i++) {
        node.set(i, this._update[i].forward(i));
        this._update[i].set(i, node);
      }
    }
  }

  get(key: K): V | null {
    let node = this.head;
    for (let i: i32 = this.level - 1; i >= 0; i--) {
      while (node.forward(i).key < key) {
        node = node.forward(i);
      }
    }
    node = node.forward(0);
    if (node.key == key) return node.value;
    return null;
  }

  private randomLvl(): u32 {
    let lvl: u32 = 1;
    while (lessThanE(this.rng) && lvl < this.maxLevel) {
      lvl++;
    }
    return lvl;
  }

  delete(key: K): void {
    let node = this.head;
    for (let i: i32 = <i32>this.level - 1; i >= 0; i--) {
      while (node.forward(i).key < key) {
        node = node.forward(i);
      }
      this._update[i] = node;
    }
    node = node.ptrs[0];
    if (node.key == key) {
      
    }

  }
}



// function Skiplist(maxsize)
// {
// 	this.maxsize = maxsize || 65535;
// 	this.maxlevel = Math.round(Math.log(this.maxsize, 2));

// 	this.level = 0;
// 	this.head = makeNode(this.maxlevel);
// 	this.tail = NIL;
// 	for (var i = 0; i < this.maxlevel; i++)
// 		this.head[i + 3] = NIL;
// 	this._update = new Array(this.maxlevel + 1);
// 	for (i = 0; i < this._update.length; i++)
// 		this._update[i] = this.head;
// }

// Skiplist.prototype._randomLevel = function()
// {
// 	var lvl = 0;
// 	var max = Math.min(this.maxlevel, this.level + 1);
// 	while ((Math.random() < P) && (lvl < max))
// 		lvl++;
// 	return lvl;
// };

// Skiplist.prototype.find = function(search, reverse)
// {
// 	var node = reverse ? this.tail : this.head[3];
// 	var idx = reverse ? 2 : 3;
// 	var results = [];

// 	if (search)
// 	{
// 		var update = this._update.slice(0);
// 		var found = this._findLess(update, search);
// 		if (!nodesEqual(found[3], NIL))
// 			node = found[3];
// 	}
// 	while (node[0])
// 	{
// 		results.push([node[0], node[1]]);
// 		node = node[idx];
// 	}
// 	return results;
// };

// Skiplist.prototype.findWithCount = function(search, maxResultsToReturn, reverse)
// {
// 	var node = reverse ? this.tail : this.head[3];
// 	var idx = reverse ? 2 : 3;
// 	var results = [];

// 	if (search)
// 	{
// 		var update = this._update.slice(0);
// 		var found = this._findLess(update, search);
// 		if (!nodesEqual(found[3], NIL))
// 			node = found[3];
// 	}
// 	while (node[0] && (results.length < maxResultsToReturn))
// 	{
// 		results.push([node[0], node[1]]);
// 		node = node[idx];
// 	}
// 	return results;
// };

// Skiplist.prototype.length = function()
// {
// 	// more for my curiosity
// 	var node = this.head[3];
// 	var count = 0;
// 	while (node[0])
// 	{
// 		count++;
// 		node = node[3];
// 	}
// 	return count;
// };

// Skiplist.prototype._findLess = function(update, search)
// {
// 	var node = this.head;
// 	for (var i = this.level; i >= 0; i--)
// 	{
// 		var key = node[3 + i][0];
// 		while (key && (key < search))
// 		{
// 			node = node[3 + i];
// 			key = node[3 + i] ? node[3 + i][0] : null;
// 		}
// 		update[i] = node;
// 	}
// 	return node;
// };

// Skiplist.prototype.insert = function(key, value)
// {
// 	assert(key);
// 	var update = this._update.slice(0);
// 	var node = this._findLess(update, key);
// 	var prev = node;
// 	node = node[3];
// 	if (node[0] === key)
// 		node[1] = value;
// 	else
// 	{
// 		var lvl = this._randomLevel();
// 		this.level = Math.max(this.level, lvl);
// 		node = makeNode(lvl, key, value);
// 		node[2] = prev;
// 		for (var i = 0; i <= this.level; i++)
// 		{
// 			node[3 + i] = update[i][3 + i];
// 			update[i][3 + i] = node;
// 		}
// 		if (nodesEqual(node[3], NIL))
// 			this.tail = node;
// 		else
// 			node[3][2] = node;
// 	}
// };

// Skiplist.prototype.remove = function(key)
// {
// 	var update = this._update.slice(0);
// 	var node = this._findLess(update, key);
// 	node = node[3];

// 	if (node[0] === key)
// 	{
// 		node[3][2] = update[0];
// 		for (var i = 0; i <= this.level; i++)
// 		{
// 			if (!nodesEqual(update[i][3 + i], node))
// 				break;
// 			update[i][3 + i] = node[3 + i];
// 		}

// 		while ((this.level > 1) && (this.head[3 + this.level].key !== null))
// 			this.level--;

// 		if (nodesEqual(this.tail, node))
// 			this.tail = node[2];

// 		return true;
// 	}

// 	return false; // just to make it explicit
// };

// Skiplist.prototype.match = function(search)
// {
// 	var node = this.head;
// 	for (var i = this.level; i >= 0; i--)
// 	{
// 		var key = node[3 + i][0];
// 		while (key && (key < search))
// 		{
// 			node = node[3 + i];
// 			key = node[3 + i] ? node[3 + i][0] : null;
// 		}
// 	}
// 	node = node[3];
// 	if (node[0] === search)
// 		return node[1];

// 	return null;
// };
