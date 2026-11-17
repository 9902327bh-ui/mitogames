"""Domain exceptions and global exception handlers for consistent error responses."""

from typing import Any, Dict, Optional

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


class AppException(Exception):
    """Base application exception carrying an HTTP status, code and detail."""

    status_code: int = status.HTTP_400_BAD_REQUEST
    code: str = "app_error"

    def __init__(self, detail: str, code: Optional[str] = None, payload: Optional[Dict[str, Any]] = None):
        self.detail = detail
        self.code = code or self.code
        self.payload = payload or {}
        super().__init__(detail)


# ---- Common subclasses ---------------------------------------------------- #
class NotFoundError(AppException):
    status_code = status.HTTP_404_NOT_FOUND
    code = "not_found"


class ConflictError(AppException):
    status_code = status.HTTP_409_CONFLICT
    code = "conflict"


class UnauthorizedError(AppException):
    status_code = status.HTTP_401_UNAUTHORIZED
    code = "unauthorized"


class ForbiddenError(AppException):
    status_code = status.HTTP_403_FORBIDDEN
    code = "forbidden"


class ValidationError(AppException):
    status_code = status.HTTP_422_UNPROCESSABLE_CONTENT
    code = "validation_error"


class ExternalServiceError(AppException):
    status_code = status.HTTP_502_BAD_GATEWAY
    code = "external_service_error"


# ---- Handlers ------------------------------------------------------------- #
def _envelope(detail: str, code: str, status_code: int, errors: Optional[Any] = None) -> Dict[str, Any]:
    body: Dict[str, Any] = {"detail": detail, "code": code}
    if errors is not None:
        body["errors"] = errors
    return body


def register_exception_handlers(app: FastAPI) -> None:
    """Wire all global exception handlers onto the FastAPI app."""

    @app.exception_handler(AppException)
    async def _app_exception_handler(_: Request, exc: AppException) -> JSONResponse:
        body = _envelope(exc.detail, exc.code, exc.status_code, exc.payload or None)
        return JSONResponse(status_code=exc.status_code, content=body)

    @app.exception_handler(RequestValidationError)
    async def _validation_exception_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
        body = _envelope(
            "Request validation failed",
            "validation_error",
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            exc.errors(),
        )
        return JSONResponse(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, content=body)

    @app.exception_handler(Exception)
    async def _unhandled_exception_handler(_: Request, exc: Exception) -> JSONResponse:
        # Log in real life; never leak internals to clients.
        body = _envelope(
            "Internal server error",
            "internal_error",
            status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
        return JSONResponse(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, content=body)
