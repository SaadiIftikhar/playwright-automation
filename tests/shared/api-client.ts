import { expect, type APIRequestContext } from '@playwright/test';
import {
  bookEnvelopeSchema,
  bookListEnvelopeSchema,
  cartEnvelopeSchema,
  parseBody,
} from './schemas';
import type { Book, BookInput, Cart, ListMeta, ListQuery } from './types';

/**
 * Thin typed wrapper used to seed and inspect data over HTTP. UI tests use it
 * for setup so they never have to click their way into a starting state.
 *
 * Every response is parsed through the same zod schemas the API suite asserts
 * against, so the declared return types are proven rather than asserted. If the
 * API shape ever drifts, setup fails loudly here instead of surfacing as a
 * confusing assertion failure further down the test.
 */
export class BookstoreApi {
  constructor(private readonly request: APIRequestContext) {}

  async listBooks(query: ListQuery = {}): Promise<{ data: Book[]; meta: ListMeta }> {
    const params: Record<string, string> = {};
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        params[key] = String(value);
      }
    }
    const response = await this.request.get('/api/books', { params });
    expect(response.ok(), `listBooks failed: ${response.status()}`).toBeTruthy();
    return parseBody(bookListEnvelopeSchema, await response.json(), 'listBooks');
  }

  async getBook(id: string): Promise<Book> {
    const response = await this.request.get(`/api/books/${id}`);
    expect(response.ok(), `getBook failed: ${response.status()}`).toBeTruthy();
    return parseBody(bookEnvelopeSchema, await response.json(), 'getBook').data;
  }

  async createBook(input: BookInput): Promise<Book> {
    const response = await this.request.post('/api/books', { data: input });
    expect(response.status(), `createBook failed: ${await response.text()}`).toBe(201);
    return parseBody(bookEnvelopeSchema, await response.json(), 'createBook').data;
  }

  async createBooks(inputs: BookInput[]): Promise<Book[]> {
    const created: Book[] = [];
    for (const input of inputs) created.push(await this.createBook(input));
    return created;
  }

  async deleteBook(id: string): Promise<void> {
    const response = await this.request.delete(`/api/books/${id}`);
    expect(response.status()).toBe(204);
  }

  async countBooks(query: ListQuery = {}): Promise<number> {
    const { meta } = await this.listBooks({ ...query, limit: 100 });
    return meta.total;
  }

  async findByTitle(title: string): Promise<Book | undefined> {
    const { data } = await this.listBooks({ search: title, limit: 100 });
    return data.find((book) => book.title === title);
  }

  async getCart(): Promise<Cart> {
    const response = await this.request.get('/api/cart');
    expect(response.ok(), `getCart failed: ${response.status()}`).toBeTruthy();
    return parseBody(cartEnvelopeSchema, await response.json(), 'getCart').data;
  }

  async addToCart(bookId: string, quantity = 1): Promise<Cart> {
    const response = await this.request.post('/api/cart/items', {
      data: { bookId, quantity },
    });
    expect(response.status(), `addToCart failed: ${await response.text()}`).toBe(201);
    return parseBody(cartEnvelopeSchema, await response.json(), 'addToCart').data;
  }

  /** Resets this tenant only. `seed: false` gives an empty catalog. */
  async reset(options: { seed?: boolean } = {}): Promise<void> {
    const response = await this.request.post('/api/test/reset', {
      data: { seed: options.seed ?? true },
    });
    expect(response.status()).toBe(204);
  }

  async clearCatalog(): Promise<void> {
    await this.reset({ seed: false });
  }
}
