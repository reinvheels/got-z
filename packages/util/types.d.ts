declare global {
  /**
   * Extends the global Object interface with utility methods for reading and writing nested properties.
   *
   * @interface Object
   */

  interface Object {
    /**
     * Reads a value from a nested property path within the object.
     *
     * @param path - An array of strings or numbers representing the path to the desired property
     * @returns The value at the specified path, or undefined if the path doesn't exist
     *
     * @example
     * ```typescript
     * const obj = { a: { b: { c: 42 } } };
     * const value = obj.read(['a', 'b', 'c']); // Returns 42
     * ```
     */
    read(path: (string | number)[]): any;
    /**
     * Writes a value to a nested property path within the object, creating intermediate objects as needed.
     *
     * @param path - An array of strings or numbers representing the path where the value should be written
     * @param value - The value to write at the specified path
     *
     * @example
     * ```typescript
     * const obj = {};
     * obj.write(['a', 'b', 'c'], 42); // Creates { a: { b: { c: 42 } } }
     * ```
     */
    write(path: (string | number)[], value: any): void;
  }
}

export {};
