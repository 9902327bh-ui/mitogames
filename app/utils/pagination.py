"""Shared pagination helpers."""

from typing import Generic, List, Sequence, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class Page(BaseModel, Generic[T]):
    """A generic paginated response envelope."""

    items: List[T]
    total: int
    page: int
    size: int
    pages: int


def paginate(items: Sequence[T], total: int, page: int, size: int) -> Page[T]:
    """Build a Page envelope from a slice and a total count."""
    pages = (total + size - 1) // size if size > 0 else 0
    return Page[T](items=list(items), total=total, page=page, size=size, pages=pages)


def clamp_pagination(page: int, size: int, max_size: int = 100) -> tuple[int, int]:
    """Normalize page/size coming from a request."""
    page = max(1, page or 1)
    size = max(1, min(size or 20, max_size))
    return page, size


def offset_limit(page: int, size: int) -> tuple[int, int]:
    """Convert page/size to SQLAlchemy offset/limit."""
    return (page - 1) * size, size
