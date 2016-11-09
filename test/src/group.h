/** @defgroup group1 The First Group
 *  This is the first group
 *  @{
 */
/**  @brief class G1 in group 1*/
class G1 {
public:
    // What the funk?
    void whatTheFunk() const;
};
/** @} */ // end of group1

/** @defgroup group2
 */
/** @ingroup group2
 *  namespace N2 is in group2
 */
namespace N2 {
    /**
     *  @ingroup group2
     *  @brief class G2 in group 2
     */
    class G2 {
    public:
        void happyDays() const;
    };
};
