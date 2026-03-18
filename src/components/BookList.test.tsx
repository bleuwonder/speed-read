import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import BookList from "./BookList";

afterEach(cleanup);

const mockBooks = [
  {
    id: "book-1",
    title: "Test Book One",
    author: "Author One",
    format: "epub",
    total_words: 50000,
    progress_pct: 42.5,
  },
  {
    id: "book-2",
    title: "Test Book Two",
    author: null,
    format: "pdf",
    total_words: 12000,
    progress_pct: 0,
  },
];

describe("BookList", () => {
  it("shows empty state when no books", () => {
    render(<BookList books={[]} />);
    expect(screen.getByText(/no books yet/i)).toBeInTheDocument();
  });

  it("renders book titles", () => {
    render(<BookList books={mockBooks} />);
    expect(screen.getByText("Test Book One")).toBeInTheDocument();
    expect(screen.getByText("Test Book Two")).toBeInTheDocument();
  });

  it("renders author when present", () => {
    render(<BookList books={mockBooks} />);
    expect(screen.getByText("Author One")).toBeInTheDocument();
  });

  it("shows format and word count", () => {
    render(<BookList books={mockBooks} />);
    expect(screen.getByText(/EPUB/)).toBeInTheDocument();
    expect(screen.getByText(/50,000 words/)).toBeInTheDocument();
  });

  it("shows progress percentage", () => {
    render(<BookList books={mockBooks} />);
    expect(screen.getByText("43%")).toBeInTheDocument();
    expect(screen.getByText("0%")).toBeInTheDocument();
  });

  it("links to reader page", () => {
    render(<BookList books={mockBooks} />);
    const links = screen.getAllByRole("link");
    expect(links[0]).toHaveAttribute("href", "/read/book-1");
    expect(links[1]).toHaveAttribute("href", "/read/book-2");
  });
});
