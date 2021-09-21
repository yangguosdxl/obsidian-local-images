export class UniqueQueue<T> {
  private queue = new Array<T>();

  public push(value: T) {
    if (!this.queue.includes(value)) {
      this.queue.push(value);
    }
  }

  public pop() {
    return this.queue.shift();
  }
}
