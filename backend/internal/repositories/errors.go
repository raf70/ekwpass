package repositories

import "errors"

// ErrStaleUpdate is returned when an optimistic-locking check fails because
// the row's updated_at no longer matches the expected value.
var ErrStaleUpdate = errors.New("record was modified by another user")
