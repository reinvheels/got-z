declare global {
  interface Object {
    read(path: (string | number)[]): any;
    write(path: (string | number)[], value: any): void;
  }
}

export {};