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

#endif /* __MACROS_H__ */
