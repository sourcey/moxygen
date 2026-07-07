/**
  This is a global define.
*/
#define GDEFINE 1

/**
  This is a global class.
*/
class global_class {
 public:
  int global_class_a;
};

/**
  This is a global variable.
*/
global_class global_a;

/**
  @defgroup global_group Global Group

  This is the global group's description.

  @{
*/

/**
  This is a @ref global_group define.
*/
#define GGROUP_DEFINE 1

/**
  @defgroup nested_group Nested Group
  @ingroup global_group

  This is the nested group's description.

  @{
*/

/**
  This is a nested grouped class.
*/
class nested_class {
 public:
  int nested_class_a;
};

/**
  @}
*/

/**
  @}
*/
