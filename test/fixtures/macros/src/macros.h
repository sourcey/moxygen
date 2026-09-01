#ifndef __MACROS_H__
#define __MACROS_H__

/**
  The maximum number of retries.
*/
#define MAX_RETRIES 5

/**
  Clamp a value into an inclusive range.

  @param VALUE the value to clamp
  @param LO the lower bound
  @param HI the upper bound
*/
#define CLAMP(VALUE, LO, HI) ((VALUE) < (LO) ? (LO) : ((VALUE) > (HI) ? (HI) : (VALUE)))

/**
  Mark a code path as unreachable.
*/
#define UNREACHABLE() __builtin_unreachable()

#define UNDOCUMENTED_FLAG 1

/**
  Reset the retry counter.
*/
void reset(int);

/**
  Registry of handler hooks.
*/
struct handlers {
  /**
    Called when a retry is scheduled.

    @param attempt the attempt number, starting at one
    @param reason why the retry was scheduled
    @return zero to stop retrying
  */
  int (*retry)(int attempt, const char *reason);
} *registry;

/**
  Shorthand for the registry retry hook. Its initializer references another
  documented symbol, so Doxygen emits a cross-reference inside the initializer.
*/
#define RETRY_HOOK registry->retry

/**
  Configure a handler registry.

  @param target the registry to configure
  @param count how many retries to allow
  @return the configured registry
*/
struct handlers *configure(struct handlers *target, int count);

#endif /* __MACROS_H__ */
