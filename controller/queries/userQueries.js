const { Types } = require("mongoose");

// Get users of a particular company with optional search functionality
exports.getCompanyUsersQuery = (companyId, currentUserId, searchTerm) => {
  let queryArray = [];

  // Add company filter
  queryArray.push({
    $match: { companyId: Types.ObjectId.createFromHexString(companyId) },
  });

  // Add active users filter
  queryArray.push({ $match: { isActive: true } });

  // Exclude the current logged-in user from results
  queryArray.push({
    $match: { _id: { $ne: Types.ObjectId.createFromHexString(currentUserId) } },
  });

  // Only add search logic if search term is provided
  if (searchTerm && searchTerm.trim() !== "") {
    const cleanSearchTerm = searchTerm.trim();

    // Search for the term only in email
    queryArray.push({
      $match: {
        email: { $regex: cleanSearchTerm, $options: "i" },
      },
    });

    // Add fields to calculate ranking score for email only
    queryArray.push({
      $addFields: {
        emailStartsWithSearch: {
          $cond: {
            if: {
              $regexMatch: {
                input: "$email",
                regex: `^${cleanSearchTerm}`,
                options: "i",
              },
            },
            then: 1,
            else: 0,
          },
        },
        sortScore: {
          $add: [
            {
              $cond: {
                if: {
                  $regexMatch: {
                    input: "$email",
                    regex: `^${cleanSearchTerm}`,
                    options: "i",
                  },
                },
                then: 10, // High priority for email starting with search
                else: 0,
              },
            },
            {
              $cond: {
                if: {
                  $regexMatch: {
                    input: "$email",
                    regex: cleanSearchTerm,
                    options: "i",
                  },
                },
                then: 2, // Lower priority for email containing search
                else: 0,
              },
            },
          ],
        },
      },
    });

    // Sort by score (descending) then by name (ascending)
    queryArray.push({
      $sort: {
        sortScore: -1,
        name: 1,
      },
    });

    // Remove the temporary fields before returning results
    queryArray.push({
      $project: {
        emailStartsWithSearch: 0,
        sortScore: 0,
      },
    });
  } else {
    // If no search term, just sort by name
    queryArray.push({
      $sort: { name: 1 },
    });
  }

  // Project only specific fields for all queries
  queryArray.push({
    $project: {
      _id: 1,
      name: 1,
      email: 1,
      role: 1,
      isActive: 1,
      companyId: 1,
    },
  });

  return queryArray;
};
