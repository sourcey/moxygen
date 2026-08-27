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
  Create a temporary file.

  @details
  The temporary file is created in a location specified by the mysql
  server configuration (--tmpdir option).  The caller does not need to
  delete the file, it will be deleted automatically.

  @param prefix  prefix for temporary file name
  @retval -1    error
  @retval >= 0  a file handle that can be passed to dup or my_close
*/
int mysql_tmpfile(const char *prefix);

/**
  This is a global variable.
*/
global_class global_a;

/**
  @defgroup global_group Global Group
  @brief The group holding global entities.

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
