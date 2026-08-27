/* eslint-disable */
/**
 * Generated from Atlassian's Bitbucket Cloud OpenAPI 3 spec. Do not edit by hand.
 * Run `pnpm run generate:types` to refresh.
 *
 * Spec version: 2.0
 * Source:       https://dac-static.atlassian.com/cloud/bitbucket/swagger.v3.json
 */

export type paths = Record<string, never>;
export type webhooks = Record<string, never>;
export interface components {
  schemas: {
    account: {
      type: "account";
    } & (Omit<components["schemas"]["object"], "type"> &
      ({
        /** Format: date-time */
        created_on?: string;
        display_name?: string;
        links?: components["schemas"]["account_links"];
        uuid?: string;
      } & {
        [key: string]: unknown;
      }));
    /**
     * Account Links
     * @description Links related to an Account.
     */
    account_links: {
      avatar?: components["schemas"]["link"];
    } & {
      [key: string]: unknown;
    };
    app_user: {
      type: "app_user";
    } & (Omit<components["schemas"]["account"], "type"> &
      ({
        /** @description The user's Atlassian account ID. */
        account_id?: string;
        /** @description The status of the account. Currently the only possible value is "active", but more values may be added in the future. */
        account_status?: string;
        /** @description The kind of App User. */
        kind?: string;
      } & {
        [key: string]: unknown;
      }));
    /**
     * Application Property
     * @description An application property. It is a caller defined JSON object that Bitbucket will store and return.
     *     The `_attributes` field at its top level can be used to control who is allowed to read and update the property.
     *     The keys of the JSON object must match an allowed pattern. For details,
     *     see [Application properties](/cloud/bitbucket/application-properties/).
     */
    application_property: {
      _attributes?: ("public" | "read_only")[];
    } & {
      [key: string]: unknown;
    };
    author: {
      type: "author";
    } & (Omit<components["schemas"]["object"], "type"> &
      ({
        /** @description The raw author value from the repository. This may be the only value available if the author does not match a user in Bitbucket. */
        raw?: string;
        user?: components["schemas"]["account"];
      } & {
        [key: string]: unknown;
      }));
    base_commit: {
      type: "base_commit";
    } & (Omit<components["schemas"]["object"], "type"> &
      ({
        author?: components["schemas"]["author"];
        committer?: components["schemas"]["committer"];
        /** Format: date-time */
        date?: string;
        hash?: string;
        message?: string;
        parents?: components["schemas"]["base_commit"][];
        summary?: {
          /** @description The user's content rendered as HTML. */
          html?: string;
          /**
           * @description The type of markup language the raw content is to be interpreted in.
           * @enum {string}
           */
          markup?: "markdown" | "creole" | "plaintext";
          /** @description The text as it was typed by a user. */
          raw?: string;
        };
      } & {
        [key: string]: unknown;
      }));
    "bitbucket.apps.permissions.serializers.ProjectPermissionUpdateSchema": {
      /** @enum {string} */
      permission: "read" | "write" | "create-repo" | "admin";
    };
    "bitbucket.apps.permissions.serializers.RepoPermissionUpdateSchema": {
      /** @enum {string} */
      permission: "read" | "write" | "admin";
    };
    branch: components["schemas"]["ref"] &
      ({
        /** @description The default merge strategy for pull requests targeting this branch. */
        default_merge_strategy?: string;
        /** @description Available merge strategies for pull requests targeting this branch. */
        merge_strategies?: (
          | "merge_commit"
          | "squash"
          | "fast_forward"
          | "squash_fast_forward"
          | "rebase_fast_forward"
          | "rebase_merge"
        )[];
      } & {
        [key: string]: unknown;
      });
    branching_model: {
      type: "branching_model";
    } & (Omit<components["schemas"]["object"], "type"> &
      ({
        /** @description The active branch types. */
        branch_types?: {
          /**
           * @description The kind of branch.
           * @enum {string}
           */
          kind: "feature" | "bugfix" | "release" | "hotfix";
          /** @description The prefix for this branch type. A branch with this prefix will be classified as per `kind`. The prefix must be a valid prefix for a branch and must always exist. It cannot be blank, empty or `null`. */
          prefix: string;
        }[];
        development?: {
          branch?: components["schemas"]["branch"];
          /** @description Name of the target branch. Will be listed here even when the target branch does not exist. Will be `null` if targeting the main branch and the repository is empty. */
          name: string;
          /** @description Indicates if the setting points at an explicit branch (`false`) or tracks the main branch (`true`). */
          use_mainbranch: boolean;
        };
        production?: {
          branch?: components["schemas"]["branch"];
          /** @description Name of the target branch. Will be listed here even when the target branch does not exist. Will be `null` if targeting the main branch and the repository is empty. */
          name: string;
          /** @description Indicates if the setting points at an explicit branch (`false`) or tracks the main branch (`true`). */
          use_mainbranch: boolean;
        };
      } & {
        [key: string]: unknown;
      }));
    branching_model_settings: {
      type: "branching_model_settings";
    } & (Omit<components["schemas"]["object"], "type"> &
      ({
        branch_types?: {
          /** @description Whether the branch type is enabled or not. A disabled branch type may contain an invalid `prefix`. */
          enabled?: boolean;
          /**
           * @description The kind of the branch type.
           * @enum {string}
           */
          kind: "feature" | "bugfix" | "release" | "hotfix";
          /** @description The prefix for this branch type. A branch with this prefix will be classified as per `kind`. The `prefix` of an enabled branch type must be a valid branch prefix.Additionally, it cannot be blank, empty or `null`. The `prefix` for a disabled branch type can be empty or invalid. */
          prefix?: string;
        }[];
        development?: {
          /** @description Indicates if the configured branch is valid, that is, if the configured branch actually exists currently. Is always `true` when `use_mainbranch` is `true` (even if the main branch does not exist). This field is read-only. This field is ignored when updating/creating settings. */
          is_valid?: boolean;
          /** @description The configured branch. It must be `null` when `use_mainbranch` is `true`. Otherwise it must be a non-empty value. It is possible for the configured branch to not exist (e.g. it was deleted after the settings are set). In this case `is_valid` will be `false`. The branch must exist when updating/setting the `name` or an error will occur. */
          name?: string;
          /** @description Indicates if the setting points at an explicit branch (`false`) or tracks the main branch (`true`). When `true` the `name` must be `null` or not provided. When `false` the `name` must contain a non-empty branch name. */
          use_mainbranch?: boolean;
        };
        links?: {
          /**
           * Link
           * @description A link to a resource related to this object.
           */
          self?: {
            /** Format: uri */
            href?: string;
            name?: string;
          };
        };
        production?: {
          /** @description Indicates if branch is enabled or not. */
          enabled?: boolean;
          /** @description Indicates if the configured branch is valid, that is, if the configured branch actually exists currently. Is always `true` when `use_mainbranch` is `true` (even if the main branch does not exist). This field is read-only. This field is ignored when updating/creating settings. */
          is_valid?: boolean;
          /** @description The configured branch. It must be `null` when `use_mainbranch` is `true`. Otherwise it must be a non-empty value. It is possible for the configured branch to not exist (e.g. it was deleted after the settings are set). In this case `is_valid` will be `false`. The branch must exist when updating/setting the `name` or an error will occur. */
          name?: string;
          /** @description Indicates if the setting points at an explicit branch (`false`) or tracks the main branch (`true`). When `true` the `name` must be `null` or not provided. When `false` the `name` must contain a non-empty branch name. */
          use_mainbranch?: boolean;
        };
      } & {
        [key: string]: unknown;
      }));
    branchrestriction: {
      type: "branchrestriction";
    } & (Omit<components["schemas"]["object"], "type"> &
      ({
        /**
         * @description Indicates how the restriction is matched against a branch. The default is `glob`.
         * @enum {string}
         */
        branch_match_kind: "branching_model" | "glob";
        /**
         * @description Apply the restriction to branches of this type. Active when `branch_match_kind` is `branching_model`. The branch type will be calculated using the branching model configured for the repository.
         * @enum {string}
         */
        branch_type?: "feature" | "bugfix" | "release" | "hotfix" | "development" | "production";
        groups?: components["schemas"]["group"][];
        /** @description The branch restriction status' id. */
        id?: number;
        /**
         * @description The type of restriction that is being applied.
         * @enum {string}
         */
        kind:
          | "push"
          | "delete"
          | "force"
          | "restrict_merges"
          | "require_tasks_to_be_completed"
          | "require_approvals_to_merge"
          | "require_review_group_approvals_to_merge"
          | "require_default_reviewer_approvals_to_merge"
          | "require_no_changes_requested"
          | "require_passing_builds_to_merge"
          | "require_commits_behind"
          | "reset_pullrequest_approvals_on_change"
          | "smart_reset_pullrequest_approvals"
          | "reset_pullrequest_changes_requested_on_change"
          | "require_all_dependencies_merged"
          | "enforce_merge_checks"
          | "allow_auto_merge_when_builds_pass"
          | "require_all_comments_resolved";
        links?: {
          /**
           * Link
           * @description A link to a resource related to this object.
           */
          self?: {
            /** Format: uri */
            href?: string;
            name?: string;
          };
        };
        /** @description Apply the restriction to branches that match this pattern. Active when `branch_match_kind` is `glob`. Will be empty when `branch_match_kind` is `branching_model`. */
        pattern: string;
        users?: components["schemas"]["account"][];
        /**
         * @description Value with kind-specific semantics:
         *
         *     * `require_approvals_to_merge` uses it to require a minimum number of approvals on a PR.
         *
         *     * `require_default_reviewer_approvals_to_merge` uses it to require a minimum number of approvals from default reviewers on a PR.
         *
         *     * `require_passing_builds_to_merge` uses it to require a minimum number of passing builds.
         *
         *     * `require_commits_behind` uses it to require the current branch is up to a maximum number of commits behind it destination.
         */
        value?: number;
      } & {
        [key: string]: unknown;
      }));
    comment: {
      type: "comment";
    } & (Omit<components["schemas"]["object"], "type"> &
      ({
        content?: {
          /** @description The user's content rendered as HTML. */
          html?: string;
          /**
           * @description The type of markup language the raw content is to be interpreted in.
           * @enum {string}
           */
          markup?: "markdown" | "creole" | "plaintext";
          /** @description The text as it was typed by a user. */
          raw?: string;
        };
        /** Format: date-time */
        created_on?: string;
        deleted?: boolean;
        /** Format: int64 */
        id?: number;
        inline?: {
          /** @description The comment's anchor line in the old version of the file. If the comment is a multi-line comment, this is the ending line number in the old version of the file. */
          from?: number;
          /** @description The path of the file this comment is anchored to. */
          path: string;
          /** @description The starting line number in the old version of the file, if the comment is a multi-line comment. This is null otherwise. */
          start_from?: number;
          /** @description The starting line number in the new version of the file, if the comment is a multi-line comment. This is null otherwise. */
          start_to?: number;
          /** @description The comment's anchor line in the new version of the file. If the comment is a multi-line comment, this is the ending line number in the new version of the file. */
          to?: number;
        };
        links?: {
          /**
           * Link
           * @description A link to a resource related to this object.
           */
          code?: {
            /** Format: uri */
            href?: string;
            name?: string;
          };
          /**
           * Link
           * @description A link to a resource related to this object.
           */
          html?: {
            /** Format: uri */
            href?: string;
            name?: string;
          };
          /**
           * Link
           * @description A link to a resource related to this object.
           */
          self?: {
            /** Format: uri */
            href?: string;
            name?: string;
          };
        };
        parent?: components["schemas"]["comment"];
        /** Format: date-time */
        updated_on?: string;
        user?: components["schemas"]["account"];
      } & {
        [key: string]: unknown;
      }));
    /**
     * Comment Resolution
     * @description The resolution object for a Comment.
     */
    comment_resolution: {
      /**
       * Format: date-time
       * @description The ISO8601 timestamp the resolution was created.
       */
      created_on?: string;
      type: string;
      user?: components["schemas"]["account"];
    } & {
      [key: string]: unknown;
    };
    commit: {
      type: "commit";
    } & (Omit<components["schemas"]["base_commit"], "type"> &
      ({
        participants?: components["schemas"]["participant"][];
        repository?: components["schemas"]["repository"];
      } & {
        [key: string]: unknown;
      }));
    commit_comment: {
      type: "commit_comment";
    } & (Omit<components["schemas"]["comment"], "type"> &
      ({
        commit?: components["schemas"]["commit"];
      } & {
        [key: string]: unknown;
      }));
    /**
     * Commit File
     * @description A file object, representing a file at a commit in a repository
     */
    commit_file: {
      /** @enum {string} */
      attributes?: "link" | "executable" | "subrepository" | "binary" | "lfs";
      commit?: components["schemas"]["commit"];
      /** @description The escaped version of the path as it appears in a diff. If the path does not require escaping this will be the same as path. */
      escaped_path?: string;
      /** @description The path in the repository */
      path?: string;
      type: string;
    } & {
      [key: string]: unknown;
    };
    commitstatus: {
      type: "commitstatus";
    } & (Omit<components["schemas"]["object"], "type"> &
      ({
        /** Format: date-time */
        created_on?: string;
        /** @description A description of the build (e.g. "Unit tests in Bamboo") */
        description?: string;
        /**
         * @description An identifier for the status that's unique to
         *             its type (current "build" is the only supported type) and the vendor,
         *             e.g. BB-DEPLOY
         */
        key: string;
        links?: {
          /**
           * Link
           * @description A link to a resource related to this object.
           */
          commit?: {
            /** Format: uri */
            href?: string;
            name?: string;
          };
          /**
           * Link
           * @description A link to a resource related to this object.
           */
          self?: {
            /** Format: uri */
            href?: string;
            name?: string;
          };
        };
        /** @description An identifier for the build itself, e.g. BB-DEPLOY-1 */
        name?: string;
        /**
         * @description The name of the ref that pointed to this commit at the time the status
         *     object was created. Note that this the ref may since have moved off of
         *     the commit. This optional field can be useful for build systems whose
         *     build triggers and configuration are branch-dependent (e.g. a Pipeline
         *     build).
         *     It is legitimate for this field to not be set, or even apply (e.g. a
         *     static linting job).
         */
        refname?: string;
        /**
         * @description Provides some indication of the status of this commit
         * @enum {string}
         */
        state: "FAILED" | "INPROGRESS" | "STOPPED" | "SUCCESSFUL";
        /** Format: date-time */
        updated_on?: string;
        /** @description A URL linking back to the vendor or build system, for providing more information about whatever process produced this status. Accepts context variables `repository` and `commit` that Bitbucket will evaluate at runtime whenever at runtime. For example, one could use https://foo.com/builds/{repository.full_name} which Bitbucket will turn into https://foo.com/builds/foo/bar at render time. */
        url?: string;
      } & {
        [key: string]: unknown;
      }));
    committer: {
      type: "committer";
    } & (Omit<components["schemas"]["object"], "type"> &
      ({
        /** @description The raw committer value from the repository. This may be the only value available if the committer does not match a user in Bitbucket. */
        raw?: string;
        user?: components["schemas"]["account"];
      } & {
        [key: string]: unknown;
      }));
    /**
     * Default Reviewer and Type
     * @description Object containing a user that is a default reviewer and the type of reviewer
     */
    default_reviewer_and_type: {
      reviewer_type?: string;
      type: string;
      user?: components["schemas"]["user"];
    } & {
      [key: string]: unknown;
    };
    deploy_key: {
      type: "deploy_key";
    } & (Omit<components["schemas"]["object"], "type"> &
      ({
        /** Format: date-time */
        added_on?: string;
        /** @description The comment parsed from the deploy key (if present) */
        comment?: string;
        /** @description The deploy key value. */
        key?: string;
        /** @description The user-defined label for the deploy key */
        label?: string;
        /** Format: date-time */
        last_used?: string;
        links?: {
          /**
           * Link
           * @description A link to a resource related to this object.
           */
          self?: {
            /** Format: uri */
            href?: string;
            name?: string;
          };
        };
        owner?: components["schemas"]["account"];
        repository?: components["schemas"]["repository"];
      } & {
        [key: string]: unknown;
      }));
    deployment: {
      type: "deployment";
    } & (Omit<components["schemas"]["object"], "type"> &
      ({
        environment?: components["schemas"]["deployment_environment"];
        release?: components["schemas"]["deployment_release"];
        state?: components["schemas"]["deployment_state"];
        /** @description The UUID identifying the deployment. */
        uuid?: string;
      } & {
        [key: string]: unknown;
      }));
    deployment_environment: {
      type: "deployment_environment";
    } & (Omit<components["schemas"]["object"], "type"> &
      ({
        /** @description The name of the environment. */
        name?: string;
        /** @description The UUID identifying the environment. */
        uuid?: string;
      } & {
        [key: string]: unknown;
      }));
    deployment_release: {
      type: "deployment_release";
    } & (Omit<components["schemas"]["object"], "type"> &
      ({
        commit?: components["schemas"]["commit"];
        /**
         * Format: date-time
         * @description The timestamp when the release was created.
         */
        created_on?: string;
        /** @description The name of the release. */
        name?: string;
        /**
         * Format: uri
         * @description Link to the pipeline that produced the release.
         */
        url?: string;
        /** @description The UUID identifying the release. */
        uuid?: string;
      } & {
        [key: string]: unknown;
      }));
    deployment_state: {
      type: "deployment_state";
    } & (Omit<components["schemas"]["object"], "type"> & {
      [key: string]: unknown;
    });
    deployment_state_completed: {
      type: "deployment_state_completed";
    } & (Omit<components["schemas"]["deployment_state"], "type"> &
      ({
        /**
         * Format: date-time
         * @description The timestamp when the deployment completed.
         */
        completion_date?: string;
        deployer?: components["schemas"]["account"];
        /**
         * @description The name of deployment state (COMPLETED).
         * @enum {string}
         */
        name?: "COMPLETED";
        /**
         * Format: date-time
         * @description The timestamp when the deployment was started.
         */
        start_date?: string;
        status?: components["schemas"]["deployment_state_completed_status"];
        /**
         * Format: uri
         * @description Link to the deployment result.
         */
        url?: string;
      } & {
        [key: string]: unknown;
      }));
    deployment_state_completed_status: {
      type: "deployment_state_completed_status";
    } & (Omit<components["schemas"]["object"], "type"> & {
      [key: string]: unknown;
    });
    deployment_state_completed_status_failed: {
      type: "deployment_state_completed_status_failed";
    } & (Omit<components["schemas"]["deployment_state_completed_status"], "type"> &
      ({
        /**
         * @description The name of the completed deployment status (FAILED).
         * @enum {string}
         */
        name?: "FAILED";
      } & {
        [key: string]: unknown;
      }));
    deployment_state_completed_status_stopped: {
      type: "deployment_state_completed_status_stopped";
    } & (Omit<components["schemas"]["deployment_state_completed_status"], "type"> &
      ({
        /**
         * @description The name of the completed deployment status (STOPPED).
         * @enum {string}
         */
        name?: "STOPPED";
      } & {
        [key: string]: unknown;
      }));
    deployment_state_completed_status_successful: {
      type: "deployment_state_completed_status_successful";
    } & (Omit<components["schemas"]["deployment_state_completed_status"], "type"> &
      ({
        /**
         * @description The name of the completed deployment status (SUCCESSFUL).
         * @enum {string}
         */
        name?: "SUCCESSFUL";
      } & {
        [key: string]: unknown;
      }));
    deployment_state_in_progress: {
      type: "deployment_state_in_progress";
    } & (Omit<components["schemas"]["deployment_state"], "type"> &
      ({
        deployer?: components["schemas"]["account"];
        /**
         * @description The name of deployment state (IN_PROGRESS).
         * @enum {string}
         */
        name?: "IN_PROGRESS";
        /**
         * Format: date-time
         * @description The timestamp when the deployment was started.
         */
        start_date?: string;
        /**
         * Format: uri
         * @description Link to the deployment result.
         */
        url?: string;
      } & {
        [key: string]: unknown;
      }));
    deployment_state_undeployed: {
      type: "deployment_state_undeployed";
    } & (Omit<components["schemas"]["deployment_state"], "type"> &
      ({
        /**
         * @description The name of deployment state (UNDEPLOYED).
         * @enum {string}
         */
        name?: "UNDEPLOYED";
        /**
         * Format: uri
         * @description Link to trigger the deployment.
         */
        trigger_url?: string;
      } & {
        [key: string]: unknown;
      }));
    deployment_variable: {
      type: "deployment_variable";
    } & (Omit<components["schemas"]["object"], "type"> &
      ({
        /** @description The unique name of the variable. */
        key?: string;
        /** @description If true, this variable will be treated as secured. The value will never be exposed in the logs or the REST API. */
        secured?: boolean;
        /** @description The UUID identifying the variable. */
        uuid?: string;
        /** @description The value of the variable. If the variable is secured, this will be empty. */
        value?: string;
      } & {
        [key: string]: unknown;
      }));
    /**
     * Diff Stat
     * @description A diffstat object that includes a summary of changes made to a file between two commits.
     */
    diffstat: {
      lines_added?: number;
      lines_removed?: number;
      new?: components["schemas"]["commit_file"];
      old?: components["schemas"]["commit_file"];
      /** @enum {string} */
      status?: "added" | "removed" | "modified" | "renamed";
      type: string;
    } & {
      [key: string]: unknown;
    };
    effective_repo_branching_model: {
      type: "effective_repo_branching_model";
    } & (Omit<components["schemas"]["object"], "type"> &
      ({
        /** @description The active branch types. */
        branch_types?: {
          /**
           * @description The kind of branch.
           * @enum {string}
           */
          kind: "feature" | "bugfix" | "release" | "hotfix";
          /** @description The prefix for this branch type. A branch with this prefix will be classified as per `kind`. The prefix must be a valid prefix for a branch and must always exist. It cannot be blank, empty or `null`. */
          prefix: string;
        }[];
        development?: {
          branch?: components["schemas"]["branch"];
          /** @description Name of the target branch. Will be listed here even when the target branch does not exist. Will be `null` if targeting the main branch and the repository is empty. */
          name: string;
          /** @description Indicates if the setting points at an explicit branch (`false`) or tracks the main branch (`true`). */
          use_mainbranch: boolean;
        };
        production?: {
          branch?: components["schemas"]["branch"];
          /** @description Name of the target branch. Will be listed here even when the target branch does not exist. Will be `null` if targeting the main branch and the repository is empty. */
          name: string;
          /** @description Indicates if the setting points at an explicit branch (`false`) or tracks the main branch (`true`). */
          use_mainbranch: boolean;
        };
      } & {
        [key: string]: unknown;
      }));
    /**
     * Error
     * @description Base type for most resource objects. It defines the common `type` element that identifies an object's type. It also identifies the element as Swagger's `discriminator`.
     */
    error: {
      error?: {
        /** @description Optional structured data that is endpoint-specific. */
        data?: {
          [key: string]: unknown;
        };
        detail?: string;
        message: string;
      };
      type: string;
    } & {
      [key: string]: unknown;
    };
    /**
     * File Conflict
     * @description A file conflict object.
     */
    file_conflict: {
      message?: string;
      path?: string;
      /** @enum {string} */
      scenario?:
        | "delete_modify"
        | "modify_delete"
        | "content"
        | "binary"
        | "flags"
        | "mode"
        | "type"
        | "symlink"
        | "directory_file"
        | "file_directory"
        | "add_rename"
        | "rename_add"
        | "delete_rename"
        | "rename_delete"
        | "rename"
        | "subrepo"
        | "unknown";
      type: string;
    } & {
      [key: string]: unknown;
    };
    GPG_account_key: {
      type: "GPG_account_key";
    } & (Omit<components["schemas"]["object"], "type"> &
      ({
        /** Format: date-time */
        added_on?: string;
        /** Format: date-time */
        created_on?: string;
        /** Format: date-time */
        expires_on?: string;
        /** @description The GPG key fingerprint. */
        fingerprint?: string;
        /** @description The GPG key value in X format. */
        key?: string;
        /** @description The unique identifier for the GPG key */
        key_id?: string;
        /** Format: date-time */
        last_used?: string;
        links?: {
          /**
           * Link
           * @description A link to a resource related to this object.
           */
          self?: {
            /** Format: uri */
            href?: string;
            name?: string;
          };
        };
        /** @description The user-defined label for the GPG key */
        name?: string;
        owner?: components["schemas"]["account"];
        /** @description The fingerprint of the parent key. This value is null unless the current key is a subkey. */
        parent_fingerprint?: string;
        subkeys?: components["schemas"]["GPG_account_key"][];
      } & {
        [key: string]: unknown;
      }));
    group: {
      type: "group";
    } & (Omit<components["schemas"]["object"], "type"> &
      ({
        /**
         * @description The concatenation of the workspace's slug and the group's slug,
         *     separated with a colon (e.g. `acme:developers`)
         */
        full_slug?: string;
        links?: {
          /**
           * Link
           * @description A link to a resource related to this object.
           */
          html?: {
            /** Format: uri */
            href?: string;
            name?: string;
          };
          /**
           * Link
           * @description A link to a resource related to this object.
           */
          self?: {
            /** Format: uri */
            href?: string;
            name?: string;
          };
        };
        name?: string;
        owner?: components["schemas"]["account"];
        /**
         * @description The "sluggified" version of the group's name. This contains only ASCII
         *     characters and can therefore be slightly different than the name
         */
        slug?: string;
        workspace?: components["schemas"]["workspace"];
      } & {
        [key: string]: unknown;
      }));
    /**
     * Hook Event
     * @description An event, associated with a resource or subject type.
     */
    hook_event: {
      /** @description The category this event belongs to. */
      category?: string;
      /** @description More detailed description of the webhook event type. */
      description?: string;
      /**
       * @description The event identifier.
       * @enum {string}
       */
      event?:
        | "issue:comment_created"
        | "issue:created"
        | "issue:updated"
        | "pipeline:span_created"
        | "project:updated"
        | "pullrequest:approved"
        | "pullrequest:changes_request_created"
        | "pullrequest:changes_request_removed"
        | "pullrequest:comment_created"
        | "pullrequest:comment_deleted"
        | "pullrequest:comment_reopened"
        | "pullrequest:comment_resolved"
        | "pullrequest:comment_updated"
        | "pullrequest:created"
        | "pullrequest:fulfilled"
        | "pullrequest:push"
        | "pullrequest:rejected"
        | "pullrequest:unapproved"
        | "pullrequest:updated"
        | "repo:commit_comment_created"
        | "repo:commit_status_created"
        | "repo:commit_status_updated"
        | "repo:created"
        | "repo:deleted"
        | "repo:fork"
        | "repo:imported"
        | "repo:push"
        | "repo:transfer"
        | "repo:updated";
      /** @description Summary of the webhook event type. */
      label?: string;
    };
    /**
     * Link
     * @description A link to a resource related to this object.
     */
    link: {
      /** Format: uri */
      href?: string;
      name?: string;
    };
    /** @description Base type for most resource objects. It defines the common `type` element that identifies an object's type. It also identifies the element as Swagger's `discriminator`. */
    object: {
      type: string;
    } & {
      [key: string]: unknown;
    };
    /**
     * Paginated Accounts
     * @description A paginated list of accounts.
     */
    paginated_accounts: {
      /**
       * Format: uri
       * @description Link to the next page if it exists. The last page of a collection does not have this value. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      next?: string;
      /** @description Page number of the current results. This is an optional element that is not provided in all responses. */
      page?: number;
      /** @description Current number of objects on the existing page. The default value is 10 with 100 being the maximum allowed value. Individual APIs may enforce different values. */
      pagelen?: number;
      /**
       * Format: uri
       * @description Link to previous page if it exists. A collections first page does not have this value. This is an optional element that is not provided in all responses. Some result sets strictly support forward navigation and never provide previous links. Clients must anticipate that backwards navigation is not always available. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      previous?: string;
      /** @description Total number of objects in the response. This is an optional element that is not provided in all responses, as it can be expensive to compute. */
      size?: number;
      values?: components["schemas"]["account"][];
    };
    /**
     * Paginated Annotations
     * @description A paginated list of annotations.
     */
    paginated_annotations: {
      /**
       * Format: uri
       * @description Link to the next page if it exists. The last page of a collection does not have this value. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      next?: string;
      /** @description Page number of the current results. This is an optional element that is not provided in all responses. */
      page?: number;
      /** @description Current number of objects on the existing page. The default value is 10 with 100 being the maximum allowed value. Individual APIs may enforce different values. */
      pagelen?: number;
      /**
       * Format: uri
       * @description Link to previous page if it exists. A collections first page does not have this value. This is an optional element that is not provided in all responses. Some result sets strictly support forward navigation and never provide previous links. Clients must anticipate that backwards navigation is not always available. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      previous?: string;
      /** @description Total number of objects in the response. This is an optional element that is not provided in all responses, as it can be expensive to compute. */
      size?: number;
      /** @description The values of the current page. */
      values?: components["schemas"]["report_annotation"][];
    };
    /**
     * Paginated Branches
     * @description A paginated list of branches.
     */
    paginated_branches: {
      /**
       * Format: uri
       * @description Link to the next page if it exists. The last page of a collection does not have this value. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      next?: string;
      /** @description Page number of the current results. This is an optional element that is not provided in all responses. */
      page?: number;
      /** @description Current number of objects on the existing page. The default value is 10 with 100 being the maximum allowed value. Individual APIs may enforce different values. */
      pagelen?: number;
      /**
       * Format: uri
       * @description Link to previous page if it exists. A collections first page does not have this value. This is an optional element that is not provided in all responses. Some result sets strictly support forward navigation and never provide previous links. Clients must anticipate that backwards navigation is not always available. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      previous?: string;
      /** @description Total number of objects in the response. This is an optional element that is not provided in all responses, as it can be expensive to compute. */
      size?: number;
      values?: components["schemas"]["branch"][];
    };
    /**
     * Paginated Branch Restrictions
     * @description A paginated list of branch restriction rules.
     */
    paginated_branchrestrictions: {
      /**
       * Format: uri
       * @description Link to the next page if it exists. The last page of a collection does not have this value. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      next?: string;
      /** @description Page number of the current results. This is an optional element that is not provided in all responses. */
      page?: number;
      /** @description Current number of objects on the existing page. The default value is 10 with 100 being the maximum allowed value. Individual APIs may enforce different values. */
      pagelen?: number;
      /**
       * Format: uri
       * @description Link to previous page if it exists. A collections first page does not have this value. This is an optional element that is not provided in all responses. Some result sets strictly support forward navigation and never provide previous links. Clients must anticipate that backwards navigation is not always available. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      previous?: string;
      /** @description Total number of objects in the response. This is an optional element that is not provided in all responses, as it can be expensive to compute. */
      size?: number;
      values?: components["schemas"]["branchrestriction"][];
    };
    /**
     * Page
     * @description A paginated list of commits.
     */
    paginated_changeset: {
      /**
       * Format: uri
       * @description Link to the next page if it exists. The last page of a collection does not have this value. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      next?: string;
      /** @description Page number of the current results. This is an optional element that is not provided in all responses. */
      page?: number;
      /** @description Current number of objects on the existing page. The default value is 10 with 100 being the maximum allowed value. Individual APIs may enforce different values. */
      pagelen?: number;
      /**
       * Format: uri
       * @description Link to previous page if it exists. A collections first page does not have this value. This is an optional element that is not provided in all responses. Some result sets strictly support forward navigation and never provide previous links. Clients must anticipate that backwards navigation is not always available. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      previous?: string;
      /** @description Total number of objects in the response. This is an optional element that is not provided in all responses, as it can be expensive to compute. */
      size?: number;
      values?: components["schemas"]["base_commit"][];
    };
    /**
     * Paginated Commit Comments
     * @description A paginated list of commit comments.
     */
    paginated_commit_comments: {
      /**
       * Format: uri
       * @description Link to the next page if it exists. The last page of a collection does not have this value. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      next?: string;
      /** @description Page number of the current results. This is an optional element that is not provided in all responses. */
      page?: number;
      /** @description Current number of objects on the existing page. The default value is 10 with 100 being the maximum allowed value. Individual APIs may enforce different values. */
      pagelen?: number;
      /**
       * Format: uri
       * @description Link to previous page if it exists. A collections first page does not have this value. This is an optional element that is not provided in all responses. Some result sets strictly support forward navigation and never provide previous links. Clients must anticipate that backwards navigation is not always available. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      previous?: string;
      /** @description Total number of objects in the response. This is an optional element that is not provided in all responses, as it can be expensive to compute. */
      size?: number;
      values?: components["schemas"]["commit_comment"][];
    };
    /**
     * Paginated Commit Statuses
     * @description A paginated list of commit status objects.
     */
    paginated_commitstatuses: {
      /**
       * Format: uri
       * @description Link to the next page if it exists. The last page of a collection does not have this value. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      next?: string;
      /** @description Page number of the current results. This is an optional element that is not provided in all responses. */
      page?: number;
      /** @description Current number of objects on the existing page. The default value is 10 with 100 being the maximum allowed value. Individual APIs may enforce different values. */
      pagelen?: number;
      /**
       * Format: uri
       * @description Link to previous page if it exists. A collections first page does not have this value. This is an optional element that is not provided in all responses. Some result sets strictly support forward navigation and never provide previous links. Clients must anticipate that backwards navigation is not always available. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      previous?: string;
      /** @description Total number of objects in the response. This is an optional element that is not provided in all responses, as it can be expensive to compute. */
      size?: number;
      values?: components["schemas"]["commitstatus"][];
    };
    /**
     * Paginated Default Reviewer and Type
     * @description A paginated list of default reviewers with reviewer type.
     */
    paginated_default_reviewer_and_type: {
      /**
       * Format: uri
       * @description Link to the next page if it exists. The last page of a collection does not have this value. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      next?: string;
      /** @description Page number of the current results. This is an optional element that is not provided in all responses. */
      page?: number;
      /** @description Current number of objects on the existing page. The default value is 10 with 100 being the maximum allowed value. Individual APIs may enforce different values. */
      pagelen?: number;
      /**
       * Format: uri
       * @description Link to previous page if it exists. A collections first page does not have this value. This is an optional element that is not provided in all responses. Some result sets strictly support forward navigation and never provide previous links. Clients must anticipate that backwards navigation is not always available. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      previous?: string;
      /** @description Total number of objects in the response. This is an optional element that is not provided in all responses, as it can be expensive to compute. */
      size?: number;
      values?: components["schemas"]["default_reviewer_and_type"][];
    };
    /**
     * Paginated Deploy Keys
     * @description A paginated list of deploy keys.
     */
    paginated_deploy_keys: {
      /**
       * Format: uri
       * @description Link to the next page if it exists. The last page of a collection does not have this value. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      next?: string;
      /** @description Page number of the current results. This is an optional element that is not provided in all responses. */
      page?: number;
      /** @description Current number of objects on the existing page. The default value is 10 with 100 being the maximum allowed value. Individual APIs may enforce different values. */
      pagelen?: number;
      /**
       * Format: uri
       * @description Link to previous page if it exists. A collections first page does not have this value. This is an optional element that is not provided in all responses. Some result sets strictly support forward navigation and never provide previous links. Clients must anticipate that backwards navigation is not always available. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      previous?: string;
      /** @description Total number of objects in the response. This is an optional element that is not provided in all responses, as it can be expensive to compute. */
      size?: number;
      values?: components["schemas"]["deploy_key"][];
    };
    /**
     * Paginated Deployment Variables
     * @description A paged list of deployment variables.
     */
    paginated_deployment_variable: {
      /**
       * Format: uri
       * @description Link to the next page if it exists. The last page of a collection does not have this value. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      next?: string;
      /** @description Page number of the current results. This is an optional element that is not provided in all responses. */
      page?: number;
      /** @description Current number of objects on the existing page. The default value is 10 with 100 being the maximum allowed value. Individual APIs may enforce different values. */
      pagelen?: number;
      /**
       * Format: uri
       * @description Link to previous page if it exists. A collections first page does not have this value. This is an optional element that is not provided in all responses. Some result sets strictly support forward navigation and never provide previous links. Clients must anticipate that backwards navigation is not always available. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      previous?: string;
      /** @description Total number of objects in the response. This is an optional element that is not provided in all responses, as it can be expensive to compute. */
      size?: number;
      /** @description The values of the current page. */
      values?: components["schemas"]["deployment_variable"][];
    };
    /**
     * Paginated Deployments
     * @description A paged list of deployments
     */
    paginated_deployments: {
      /**
       * Format: uri
       * @description Link to the next page if it exists. The last page of a collection does not have this value. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      next?: string;
      /** @description Page number of the current results. This is an optional element that is not provided in all responses. */
      page?: number;
      /** @description Current number of objects on the existing page. The default value is 10 with 100 being the maximum allowed value. Individual APIs may enforce different values. */
      pagelen?: number;
      /**
       * Format: uri
       * @description Link to previous page if it exists. A collections first page does not have this value. This is an optional element that is not provided in all responses. Some result sets strictly support forward navigation and never provide previous links. Clients must anticipate that backwards navigation is not always available. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      previous?: string;
      /** @description Total number of objects in the response. This is an optional element that is not provided in all responses, as it can be expensive to compute. */
      size?: number;
      /** @description The values of the current page. */
      values?: components["schemas"]["deployment"][];
    };
    /**
     * Paginated Diff Stat
     * @description A paginated list of diffstats.
     */
    paginated_diffstats: {
      /**
       * Format: uri
       * @description Link to the next page if it exists. The last page of a collection does not have this value. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      next?: string;
      /** @description Page number of the current results. This is an optional element that is not provided in all responses. */
      page?: number;
      /** @description Current number of objects on the existing page. The default value is 500 with 5000 being the maximum allowed value. */
      pagelen?: number;
      /**
       * Format: uri
       * @description Link to previous page if it exists. A collections first page does not have this value. This is an optional element that is not provided in all responses. Some result sets strictly support forward navigation and never provide previous links. Clients must anticipate that backwards navigation is not always available. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      previous?: string;
      /** @description Total number of objects in the response. This is an optional element that is not provided in all responses, as it can be expensive to compute. */
      size?: number;
      values?: components["schemas"]["diffstat"][];
    };
    /**
     * Paginated Deployment Environments
     * @description A paged list of environments
     */
    paginated_environments: {
      /**
       * Format: uri
       * @description Link to the next page if it exists. The last page of a collection does not have this value. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      next?: string;
      /** @description Page number of the current results. This is an optional element that is not provided in all responses. */
      page?: number;
      /** @description Current number of objects on the existing page. The default value is 10 with 100 being the maximum allowed value. Individual APIs may enforce different values. */
      pagelen?: number;
      /**
       * Format: uri
       * @description Link to previous page if it exists. A collections first page does not have this value. This is an optional element that is not provided in all responses. Some result sets strictly support forward navigation and never provide previous links. Clients must anticipate that backwards navigation is not always available. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      previous?: string;
      /** @description Total number of objects in the response. This is an optional element that is not provided in all responses, as it can be expensive to compute. */
      size?: number;
      /** @description The values of the current page. */
      values?: components["schemas"]["deployment_environment"][];
    };
    /**
     * Paginated File Conflicts
     * @description A paginated list of file conflicts.
     */
    paginated_file_conflicts: {
      /**
       * Format: uri
       * @description Link to the next page if it exists. The last page of a collection does not have this value. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      next?: string;
      /** @description Page number of the current results. This is an optional element that is not provided in all responses. */
      page?: number;
      /** @description Current number of objects on the existing page. The default value is 10 with 100 being the maximum allowed value. Individual APIs may enforce different values. */
      pagelen?: number;
      /**
       * Format: uri
       * @description Link to previous page if it exists. A collections first page does not have this value. This is an optional element that is not provided in all responses. Some result sets strictly support forward navigation and never provide previous links. Clients must anticipate that backwards navigation is not always available. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      previous?: string;
      /** @description Total number of objects in the response. This is an optional element that is not provided in all responses, as it can be expensive to compute. */
      size?: number;
      values?: components["schemas"]["file_conflict"][];
    };
    /**
     * Paginated Files
     * @description A paginated list of commit_file objects.
     */
    paginated_files: {
      /**
       * Format: uri
       * @description Link to the next page if it exists. The last page of a collection does not have this value. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      next?: string;
      /** @description Page number of the current results. This is an optional element that is not provided in all responses. */
      page?: number;
      /** @description Current number of objects on the existing page. The default value is 10 with 100 being the maximum allowed value. Individual APIs may enforce different values. */
      pagelen?: number;
      /**
       * Format: uri
       * @description Link to previous page if it exists. A collections first page does not have this value. This is an optional element that is not provided in all responses. Some result sets strictly support forward navigation and never provide previous links. Clients must anticipate that backwards navigation is not always available. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      previous?: string;
      /** @description Total number of objects in the response. This is an optional element that is not provided in all responses, as it can be expensive to compute. */
      size?: number;
      values?: components["schemas"]["commit_file"][];
    };
    /**
     * Paginated GPG User Keys
     * @description A paginated list of GPG keys.
     */
    paginated_gpg_user_keys: {
      /**
       * Format: uri
       * @description Link to the next page if it exists. The last page of a collection does not have this value. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      next?: string;
      /** @description Page number of the current results. This is an optional element that is not provided in all responses. */
      page?: number;
      /** @description Current number of objects on the existing page. The default value is 10 with 100 being the maximum allowed value. Individual APIs may enforce different values. */
      pagelen?: number;
      /**
       * Format: uri
       * @description Link to previous page if it exists. A collections first page does not have this value. This is an optional element that is not provided in all responses. Some result sets strictly support forward navigation and never provide previous links. Clients must anticipate that backwards navigation is not always available. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      previous?: string;
      /** @description Total number of objects in the response. This is an optional element that is not provided in all responses, as it can be expensive to compute. */
      size?: number;
      values?: components["schemas"]["GPG_account_key"][];
    };
    /**
     * Paginated Hook Events
     * @description A paginated list of webhook types available to subscribe on.
     */
    paginated_hook_events: {
      /**
       * Format: uri
       * @description Link to the next page if it exists. The last page of a collection does not have this value. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      next?: string;
      /** @description Page number of the current results. This is an optional element that is not provided in all responses. */
      page?: number;
      /** @description Current number of objects on the existing page. The default value is 10 with 100 being the maximum allowed value. Individual APIs may enforce different values. */
      pagelen?: number;
      /**
       * Format: uri
       * @description Link to previous page if it exists. A collections first page does not have this value. This is an optional element that is not provided in all responses. Some result sets strictly support forward navigation and never provide previous links. Clients must anticipate that backwards navigation is not always available. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      previous?: string;
      /** @description Total number of objects in the response. This is an optional element that is not provided in all responses, as it can be expensive to compute. */
      size?: number;
      values?: components["schemas"]["hook_event"][];
    };
    /**
     * Paginated Pipeline Cache
     * @description A paged list of pipeline caches
     */
    paginated_pipeline_caches: {
      /**
       * Format: uri
       * @description Link to the next page if it exists. The last page of a collection does not have this value. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      next?: string;
      /** @description Page number of the current results. This is an optional element that is not provided in all responses. */
      page?: number;
      /** @description Current number of objects on the existing page. The default value is 10 with 100 being the maximum allowed value. Individual APIs may enforce different values. */
      pagelen?: number;
      /**
       * Format: uri
       * @description Link to previous page if it exists. A collections first page does not have this value. This is an optional element that is not provided in all responses. Some result sets strictly support forward navigation and never provide previous links. Clients must anticipate that backwards navigation is not always available. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      previous?: string;
      /** @description Total number of objects in the response. This is an optional element that is not provided in all responses, as it can be expensive to compute. */
      size?: number;
      /** @description The values of the current page. */
      values?: components["schemas"]["pipeline_cache"][];
    };
    /**
     * Paginated Pipeline Known Hosts
     * @description A paged list of known hosts.
     */
    paginated_pipeline_known_hosts: {
      /**
       * Format: uri
       * @description Link to the next page if it exists. The last page of a collection does not have this value. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      next?: string;
      /** @description Page number of the current results. This is an optional element that is not provided in all responses. */
      page?: number;
      /** @description Current number of objects on the existing page. The default value is 10 with 100 being the maximum allowed value. Individual APIs may enforce different values. */
      pagelen?: number;
      /**
       * Format: uri
       * @description Link to previous page if it exists. A collections first page does not have this value. This is an optional element that is not provided in all responses. Some result sets strictly support forward navigation and never provide previous links. Clients must anticipate that backwards navigation is not always available. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      previous?: string;
      /** @description Total number of objects in the response. This is an optional element that is not provided in all responses, as it can be expensive to compute. */
      size?: number;
      /** @description The values of the current page. */
      values?: components["schemas"]["pipeline_known_host"][];
    };
    /**
     * Paginated Runners
     * @description A paged list of runners.
     */
    paginated_pipeline_runners: {
      /** @description Link to the next page if it exists. The last page of a collection does not have this value. Use this link to navigate the result set and refrain from constructing your own URLs. */
      next?: string;
      /** @description Page number of the current results. This is an optional element that is not provided in all responses. */
      page?: number;
      /** @description Current number of objects on the existing page. The default value is 10 with 100 being the maximum allowed value. Individual APIs may enforce different values. */
      pagelen?: number;
      /** @description Link to previous page if it exists. A collections first page does not have this value. This is an optional element that is not provided in all responses. Some result sets strictly support forward navigation and never provide previous links. Clients must anticipate that backwards navigation is not always available. Use this link to navigate the result set and refrain from constructing your own URLs. */
      previous?: string;
      /** @description Total number of objects in the response. This is an optional element that is not provided in all responses, as it can be expensive to compute. */
      size?: number;
      /** @description The values of the current page. */
      values?: components["schemas"]["pipeline_runner"][];
    };
    /**
     * Paginated Pipeline Schedule Executions
     * @description A paged list of the executions of a schedule.
     */
    paginated_pipeline_schedule_executions: {
      /**
       * Format: uri
       * @description Link to the next page if it exists. The last page of a collection does not have this value. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      next?: string;
      /** @description Page number of the current results. This is an optional element that is not provided in all responses. */
      page?: number;
      /** @description Current number of objects on the existing page. The default value is 10 with 100 being the maximum allowed value. Individual APIs may enforce different values. */
      pagelen?: number;
      /**
       * Format: uri
       * @description Link to previous page if it exists. A collections first page does not have this value. This is an optional element that is not provided in all responses. Some result sets strictly support forward navigation and never provide previous links. Clients must anticipate that backwards navigation is not always available. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      previous?: string;
      /** @description Total number of objects in the response. This is an optional element that is not provided in all responses, as it can be expensive to compute. */
      size?: number;
      /** @description The values of the current page. */
      values?: components["schemas"]["pipeline_schedule_execution"][];
    };
    /**
     * Paginated Pipeline Schedule
     * @description A paged list of schedules
     */
    paginated_pipeline_schedules: {
      /**
       * Format: uri
       * @description Link to the next page if it exists. The last page of a collection does not have this value. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      next?: string;
      /** @description Page number of the current results. This is an optional element that is not provided in all responses. */
      page?: number;
      /** @description Current number of objects on the existing page. The default value is 10 with 100 being the maximum allowed value. Individual APIs may enforce different values. */
      pagelen?: number;
      /**
       * Format: uri
       * @description Link to previous page if it exists. A collections first page does not have this value. This is an optional element that is not provided in all responses. Some result sets strictly support forward navigation and never provide previous links. Clients must anticipate that backwards navigation is not always available. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      previous?: string;
      /** @description Total number of objects in the response. This is an optional element that is not provided in all responses, as it can be expensive to compute. */
      size?: number;
      /** @description The values of the current page. */
      values?: components["schemas"]["pipeline_schedule"][];
    };
    /**
     * Paginated Pipeline Steps
     * @description A paged list of pipeline steps.
     */
    paginated_pipeline_steps: {
      /**
       * Format: uri
       * @description Link to the next page if it exists. The last page of a collection does not have this value. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      next?: string;
      /** @description Page number of the current results. This is an optional element that is not provided in all responses. */
      page?: number;
      /** @description Current number of objects on the existing page. The default value is 10 with 100 being the maximum allowed value. Individual APIs may enforce different values. */
      pagelen?: number;
      /**
       * Format: uri
       * @description Link to previous page if it exists. A collections first page does not have this value. This is an optional element that is not provided in all responses. Some result sets strictly support forward navigation and never provide previous links. Clients must anticipate that backwards navigation is not always available. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      previous?: string;
      /** @description Total number of objects in the response. This is an optional element that is not provided in all responses, as it can be expensive to compute. */
      size?: number;
      /** @description The values of the current page. */
      values?: components["schemas"]["pipeline_step"][];
    };
    /**
     * Paginated Pipeline Variables
     * @description A paged list of variables.
     */
    paginated_pipeline_variables: {
      /**
       * Format: uri
       * @description Link to the next page if it exists. The last page of a collection does not have this value. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      next?: string;
      /** @description Page number of the current results. This is an optional element that is not provided in all responses. */
      page?: number;
      /** @description Current number of objects on the existing page. The default value is 10 with 100 being the maximum allowed value. Individual APIs may enforce different values. */
      pagelen?: number;
      /**
       * Format: uri
       * @description Link to previous page if it exists. A collections first page does not have this value. This is an optional element that is not provided in all responses. Some result sets strictly support forward navigation and never provide previous links. Clients must anticipate that backwards navigation is not always available. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      previous?: string;
      /** @description Total number of objects in the response. This is an optional element that is not provided in all responses, as it can be expensive to compute. */
      size?: number;
      /** @description The values of the current page. */
      values?: components["schemas"]["pipeline_variable"][];
    };
    /**
     * Paginated Pipelines
     * @description A paged list of pipelines
     */
    paginated_pipelines: {
      /**
       * Format: uri
       * @description Link to the next page if it exists. The last page of a collection does not have this value. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      next?: string;
      /** @description Page number of the current results. This is an optional element that is not provided in all responses. */
      page?: number;
      /** @description Current number of objects on the existing page. The default value is 10 with 100 being the maximum allowed value. Individual APIs may enforce different values. */
      pagelen?: number;
      /**
       * Format: uri
       * @description Link to previous page if it exists. A collections first page does not have this value. This is an optional element that is not provided in all responses. Some result sets strictly support forward navigation and never provide previous links. Clients must anticipate that backwards navigation is not always available. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      previous?: string;
      /** @description Total number of objects in the response. This is an optional element that is not provided in all responses, as it can be expensive to compute. */
      size?: number;
      /** @description The values of the current page. */
      values?: components["schemas"]["pipeline"][];
    };
    /**
     * Paginated Project Deploy Keys
     * @description A paginated list of project deploy keys.
     */
    paginated_project_deploy_keys: {
      /**
       * Format: uri
       * @description Link to the next page if it exists. The last page of a collection does not have this value. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      next?: string;
      /** @description Page number of the current results. This is an optional element that is not provided in all responses. */
      page?: number;
      /** @description Current number of objects on the existing page. The default value is 10 with 100 being the maximum allowed value. Individual APIs may enforce different values. */
      pagelen?: number;
      /**
       * Format: uri
       * @description Link to previous page if it exists. A collections first page does not have this value. This is an optional element that is not provided in all responses. Some result sets strictly support forward navigation and never provide previous links. Clients must anticipate that backwards navigation is not always available. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      previous?: string;
      /** @description Total number of objects in the response. This is an optional element that is not provided in all responses, as it can be expensive to compute. */
      size?: number;
      values?: components["schemas"]["project_deploy_key"][];
    };
    /**
     * Paginated Project Group Permissions
     * @description A paginated list of project group permissions.
     */
    paginated_project_group_permissions: {
      /**
       * Format: uri
       * @description Link to the next page if it exists. The last page of a collection does not have this value. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      next?: string;
      /** @description Page number of the current results. This is an optional element that is not provided in all responses. */
      page?: number;
      /** @description Current number of objects on the existing page. The default value is 10 with 100 being the maximum allowed value. Individual APIs may enforce different values. */
      pagelen?: number;
      /**
       * Format: uri
       * @description Link to previous page if it exists. A collections first page does not have this value. This is an optional element that is not provided in all responses. Some result sets strictly support forward navigation and never provide previous links. Clients must anticipate that backwards navigation is not always available. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      previous?: string;
      /** @description Total number of objects in the response. This is an optional element that is not provided in all responses, as it can be expensive to compute. */
      size?: number;
      values?: components["schemas"]["project_group_permission"][];
    };
    /**
     * Paginated Project User Permissions
     * @description A paginated list of project user permissions.
     */
    paginated_project_user_permissions: {
      /**
       * Format: uri
       * @description Link to the next page if it exists. The last page of a collection does not have this value. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      next?: string;
      /** @description Page number of the current results. This is an optional element that is not provided in all responses. */
      page?: number;
      /** @description Current number of objects on the existing page. The default value is 10 with 100 being the maximum allowed value. Individual APIs may enforce different values. */
      pagelen?: number;
      /**
       * Format: uri
       * @description Link to previous page if it exists. A collections first page does not have this value. This is an optional element that is not provided in all responses. Some result sets strictly support forward navigation and never provide previous links. Clients must anticipate that backwards navigation is not always available. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      previous?: string;
      /** @description Total number of objects in the response. This is an optional element that is not provided in all responses, as it can be expensive to compute. */
      size?: number;
      values?: components["schemas"]["project_user_permission"][];
    };
    /**
     * Paginated Projects
     * @description A paginated list of projects
     */
    paginated_projects: {
      /**
       * Format: uri
       * @description Link to the next page if it exists. The last page of a collection does not have this value. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      next?: string;
      /** @description Page number of the current results. This is an optional element that is not provided in all responses. */
      page?: number;
      /** @description Current number of objects on the existing page. The default value is 10 with 100 being the maximum allowed value. Individual APIs may enforce different values. */
      pagelen?: number;
      /**
       * Format: uri
       * @description Link to previous page if it exists. A collections first page does not have this value. This is an optional element that is not provided in all responses. Some result sets strictly support forward navigation and never provide previous links. Clients must anticipate that backwards navigation is not always available. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      previous?: string;
      /** @description Total number of objects in the response. This is an optional element that is not provided in all responses, as it can be expensive to compute. */
      size?: number;
      values?: components["schemas"]["project"][];
    };
    /**
     * Paginated Pull Request Comments
     * @description A paginated list of pullrequest comments.
     */
    paginated_pullrequest_comments: {
      /**
       * Format: uri
       * @description Link to the next page if it exists. The last page of a collection does not have this value. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      next?: string;
      /** @description Page number of the current results. This is an optional element that is not provided in all responses. */
      page?: number;
      /** @description Current number of objects on the existing page. The default value is 10 with 100 being the maximum allowed value. Individual APIs may enforce different values. */
      pagelen?: number;
      /**
       * Format: uri
       * @description Link to previous page if it exists. A collections first page does not have this value. This is an optional element that is not provided in all responses. Some result sets strictly support forward navigation and never provide previous links. Clients must anticipate that backwards navigation is not always available. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      previous?: string;
      /** @description Total number of objects in the response. This is an optional element that is not provided in all responses, as it can be expensive to compute. */
      size?: number;
      values?: components["schemas"]["pullrequest_comment"][];
    };
    /**
     * Paginated Pull Requests
     * @description A paginated list of pullrequests.
     */
    paginated_pullrequests: {
      /**
       * Format: uri
       * @description Link to the next page if it exists. The last page of a collection does not have this value. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      next?: string;
      /** @description Page number of the current results. This is an optional element that is not provided in all responses. */
      page?: number;
      /** @description Current number of objects on the existing page. The default value is 10 with 100 being the maximum allowed value. Individual APIs may enforce different values. */
      pagelen?: number;
      /**
       * Format: uri
       * @description Link to previous page if it exists. A collections first page does not have this value. This is an optional element that is not provided in all responses. Some result sets strictly support forward navigation and never provide previous links. Clients must anticipate that backwards navigation is not always available. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      previous?: string;
      /** @description Total number of objects in the response. This is an optional element that is not provided in all responses, as it can be expensive to compute. */
      size?: number;
      values?: components["schemas"]["pullrequest"][];
    };
    /**
     * Paginated Refs
     * @description A paginated list of refs.
     */
    paginated_refs: {
      /**
       * Format: uri
       * @description Link to the next page if it exists. The last page of a collection does not have this value. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      next?: string;
      /** @description Page number of the current results. This is an optional element that is not provided in all responses. */
      page?: number;
      /** @description Current number of objects on the existing page. The default value is 10 with 100 being the maximum allowed value. Individual APIs may enforce different values. */
      pagelen?: number;
      /**
       * Format: uri
       * @description Link to previous page if it exists. A collections first page does not have this value. This is an optional element that is not provided in all responses. Some result sets strictly support forward navigation and never provide previous links. Clients must anticipate that backwards navigation is not always available. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      previous?: string;
      /** @description Total number of objects in the response. This is an optional element that is not provided in all responses, as it can be expensive to compute. */
      size?: number;
      values?: components["schemas"]["ref"][];
    };
    /**
     * Paginated Reports
     * @description A paginated list of reports.
     */
    paginated_reports: {
      /**
       * Format: uri
       * @description Link to the next page if it exists. The last page of a collection does not have this value. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      next?: string;
      /** @description Page number of the current results. This is an optional element that is not provided in all responses. */
      page?: number;
      /** @description Current number of objects on the existing page. The default value is 10 with 100 being the maximum allowed value. Individual APIs may enforce different values. */
      pagelen?: number;
      /**
       * Format: uri
       * @description Link to previous page if it exists. A collections first page does not have this value. This is an optional element that is not provided in all responses. Some result sets strictly support forward navigation and never provide previous links. Clients must anticipate that backwards navigation is not always available. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      previous?: string;
      /** @description Total number of objects in the response. This is an optional element that is not provided in all responses, as it can be expensive to compute. */
      size?: number;
      /** @description The values of the current page. */
      values?: components["schemas"]["report"][];
    };
    /**
     * Paginated Repositories
     * @description A paginated list of repositories.
     */
    paginated_repositories: {
      /**
       * Format: uri
       * @description Link to the next page if it exists. The last page of a collection does not have this value. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      next?: string;
      /** @description Page number of the current results. This is an optional element that is not provided in all responses. */
      page?: number;
      /** @description Current number of objects on the existing page. The default value is 10 with 100 being the maximum allowed value. Individual APIs may enforce different values. */
      pagelen?: number;
      /**
       * Format: uri
       * @description Link to previous page if it exists. A collections first page does not have this value. This is an optional element that is not provided in all responses. Some result sets strictly support forward navigation and never provide previous links. Clients must anticipate that backwards navigation is not always available. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      previous?: string;
      /** @description Total number of objects in the response. This is an optional element that is not provided in all responses, as it can be expensive to compute. */
      size?: number;
      values?: components["schemas"]["repository"][];
    };
    /**
     * Paginated Repository Group Permissions
     * @description A paginated list of repository group permissions.
     */
    paginated_repository_group_permissions: {
      /**
       * Format: uri
       * @description Link to the next page if it exists. The last page of a collection does not have this value. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      next?: string;
      /** @description Page number of the current results. This is an optional element that is not provided in all responses. */
      page?: number;
      /** @description Current number of objects on the existing page. The default value is 10 with 100 being the maximum allowed value. Individual APIs may enforce different values. */
      pagelen?: number;
      /**
       * Format: uri
       * @description Link to previous page if it exists. A collections first page does not have this value. This is an optional element that is not provided in all responses. Some result sets strictly support forward navigation and never provide previous links. Clients must anticipate that backwards navigation is not always available. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      previous?: string;
      /** @description Total number of objects in the response. This is an optional element that is not provided in all responses, as it can be expensive to compute. */
      size?: number;
      values?: components["schemas"]["repository_group_permission"][];
    };
    /**
     * Paginated Repository Permissions
     * @description A paginated list of repository permissions.
     */
    paginated_repository_permissions: {
      /**
       * Format: uri
       * @description Link to the next page if it exists. The last page of a collection does not have this value. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      next?: string;
      /** @description Page number of the current results. This is an optional element that is not provided in all responses. */
      page?: number;
      /** @description Current number of objects on the existing page. The default value is 10 with 100 being the maximum allowed value. Individual APIs may enforce different values. */
      pagelen?: number;
      /**
       * Format: uri
       * @description Link to previous page if it exists. A collections first page does not have this value. This is an optional element that is not provided in all responses. Some result sets strictly support forward navigation and never provide previous links. Clients must anticipate that backwards navigation is not always available. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      previous?: string;
      /** @description Total number of objects in the response. This is an optional element that is not provided in all responses, as it can be expensive to compute. */
      size?: number;
      values?: components["schemas"]["repository_permission"][];
    };
    /**
     * Paginated Repository User Permissions
     * @description A paginated list of repository user permissions.
     */
    paginated_repository_user_permissions: {
      /**
       * Format: uri
       * @description Link to the next page if it exists. The last page of a collection does not have this value. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      next?: string;
      /** @description Page number of the current results. This is an optional element that is not provided in all responses. */
      page?: number;
      /** @description Current number of objects on the existing page. The default value is 10 with 100 being the maximum allowed value. Individual APIs may enforce different values. */
      pagelen?: number;
      /**
       * Format: uri
       * @description Link to previous page if it exists. A collections first page does not have this value. This is an optional element that is not provided in all responses. Some result sets strictly support forward navigation and never provide previous links. Clients must anticipate that backwards navigation is not always available. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      previous?: string;
      /** @description Total number of objects in the response. This is an optional element that is not provided in all responses, as it can be expensive to compute. */
      size?: number;
      values?: components["schemas"]["repository_user_permission"][];
    };
    /**
     * Paginated Snippet Comments
     * @description A paginated list of snippet comments.
     */
    paginated_snippet_comments: {
      /**
       * Format: uri
       * @description Link to the next page if it exists. The last page of a collection does not have this value. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      next?: string;
      /** @description Page number of the current results. This is an optional element that is not provided in all responses. */
      page?: number;
      /** @description Current number of objects on the existing page. The default value is 10 with 100 being the maximum allowed value. Individual APIs may enforce different values. */
      pagelen?: number;
      /**
       * Format: uri
       * @description Link to previous page if it exists. A collections first page does not have this value. This is an optional element that is not provided in all responses. Some result sets strictly support forward navigation and never provide previous links. Clients must anticipate that backwards navigation is not always available. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      previous?: string;
      /** @description Total number of objects in the response. This is an optional element that is not provided in all responses, as it can be expensive to compute. */
      size?: number;
      values?: components["schemas"]["snippet_comment"][];
    };
    /**
     * Paginated Snippet Commits
     * @description A paginated list of snippet commits.
     */
    paginated_snippet_commit: {
      /**
       * Format: uri
       * @description Link to the next page if it exists. The last page of a collection does not have this value. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      next?: string;
      /** @description Page number of the current results. This is an optional element that is not provided in all responses. */
      page?: number;
      /** @description Current number of objects on the existing page. The default value is 10 with 100 being the maximum allowed value. Individual APIs may enforce different values. */
      pagelen?: number;
      /**
       * Format: uri
       * @description Link to previous page if it exists. A collections first page does not have this value. This is an optional element that is not provided in all responses. Some result sets strictly support forward navigation and never provide previous links. Clients must anticipate that backwards navigation is not always available. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      previous?: string;
      /** @description Total number of objects in the response. This is an optional element that is not provided in all responses, as it can be expensive to compute. */
      size?: number;
      values?: components["schemas"]["snippet_commit"][];
    };
    /**
     * Paginated Snippets
     * @description A paginated list of snippets.
     */
    paginated_snippets: {
      /**
       * Format: uri
       * @description Link to the next page if it exists. The last page of a collection does not have this value. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      next?: string;
      /** @description Page number of the current results. This is an optional element that is not provided in all responses. */
      page?: number;
      /** @description Current number of objects on the existing page. The default value is 10 with 100 being the maximum allowed value. Individual APIs may enforce different values. */
      pagelen?: number;
      /**
       * Format: uri
       * @description Link to previous page if it exists. A collections first page does not have this value. This is an optional element that is not provided in all responses. Some result sets strictly support forward navigation and never provide previous links. Clients must anticipate that backwards navigation is not always available. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      previous?: string;
      /** @description Total number of objects in the response. This is an optional element that is not provided in all responses, as it can be expensive to compute. */
      size?: number;
      values?: components["schemas"]["snippet"][];
    };
    /**
     * Paginated SSH User Keys
     * @description A paginated list of SSH keys.
     */
    paginated_ssh_user_keys: {
      /**
       * Format: uri
       * @description Link to the next page if it exists. The last page of a collection does not have this value. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      next?: string;
      /** @description Page number of the current results. This is an optional element that is not provided in all responses. */
      page?: number;
      /** @description Current number of objects on the existing page. The default value is 10 with 100 being the maximum allowed value. Individual APIs may enforce different values. */
      pagelen?: number;
      /**
       * Format: uri
       * @description Link to previous page if it exists. A collections first page does not have this value. This is an optional element that is not provided in all responses. Some result sets strictly support forward navigation and never provide previous links. Clients must anticipate that backwards navigation is not always available. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      previous?: string;
      /** @description Total number of objects in the response. This is an optional element that is not provided in all responses, as it can be expensive to compute. */
      size?: number;
      values?: components["schemas"]["ssh_account_key"][];
    };
    /**
     * Paginated Tags
     * @description A paginated list of tags.
     */
    paginated_tags: {
      /**
       * Format: uri
       * @description Link to the next page if it exists. The last page of a collection does not have this value. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      next?: string;
      /** @description Page number of the current results. This is an optional element that is not provided in all responses. */
      page?: number;
      /** @description Current number of objects on the existing page. The default value is 10 with 100 being the maximum allowed value. Individual APIs may enforce different values. */
      pagelen?: number;
      /**
       * Format: uri
       * @description Link to previous page if it exists. A collections first page does not have this value. This is an optional element that is not provided in all responses. Some result sets strictly support forward navigation and never provide previous links. Clients must anticipate that backwards navigation is not always available. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      previous?: string;
      /** @description Total number of objects in the response. This is an optional element that is not provided in all responses, as it can be expensive to compute. */
      size?: number;
      values?: components["schemas"]["tag"][];
    };
    /**
     * Paginated Tasks
     * @description A paginated list of tasks.
     */
    paginated_tasks: {
      /**
       * Format: uri
       * @description Link to the next page if it exists. The last page of a collection does not have this value. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      next?: string;
      /** @description Page number of the current results. This is an optional element that is not provided in all responses. */
      page?: number;
      /** @description Current number of objects on the existing page. The default value is 10 with 100 being the maximum allowed value. Individual APIs may enforce different values. */
      pagelen?: number;
      /**
       * Format: uri
       * @description Link to previous page if it exists. A collections first page does not have this value. This is an optional element that is not provided in all responses. Some result sets strictly support forward navigation and never provide previous links. Clients must anticipate that backwards navigation is not always available. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      previous?: string;
      /** @description Total number of objects in the response. This is an optional element that is not provided in all responses, as it can be expensive to compute. */
      size?: number;
      values?: components["schemas"]["pullrequest_comment_task"][];
    };
    /**
     * Paginated Tree Entry
     * @description A paginated list of commit_file and/or commit_directory objects.
     */
    paginated_treeentries: {
      /**
       * Format: uri
       * @description Link to the next page if it exists. The last page of a collection does not have this value. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      next?: string;
      /** @description Page number of the current results. This is an optional element that is not provided in all responses. */
      page?: number;
      /** @description Current number of objects on the existing page. The default value is 10 with 100 being the maximum allowed value. Individual APIs may enforce different values. */
      pagelen?: number;
      /**
       * Format: uri
       * @description Link to previous page if it exists. A collections first page does not have this value. This is an optional element that is not provided in all responses. Some result sets strictly support forward navigation and never provide previous links. Clients must anticipate that backwards navigation is not always available. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      previous?: string;
      /** @description Total number of objects in the response. This is an optional element that is not provided in all responses, as it can be expensive to compute. */
      size?: number;
      values?: components["schemas"]["treeentry"][];
    };
    /**
     * Paginated Webhook Subscriptions
     * @description A paginated list of webhook subscriptions
     */
    paginated_webhook_subscriptions: {
      /**
       * Format: uri
       * @description Link to the next page if it exists. The last page of a collection does not have this value. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      next?: string;
      /** @description Page number of the current results. This is an optional element that is not provided in all responses. */
      page?: number;
      /** @description Current number of objects on the existing page. The default value is 10 with 100 being the maximum allowed value. Individual APIs may enforce different values. */
      pagelen?: number;
      /**
       * Format: uri
       * @description Link to previous page if it exists. A collections first page does not have this value. This is an optional element that is not provided in all responses. Some result sets strictly support forward navigation and never provide previous links. Clients must anticipate that backwards navigation is not always available. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      previous?: string;
      /** @description Total number of objects in the response. This is an optional element that is not provided in all responses, as it can be expensive to compute. */
      size?: number;
      values?: components["schemas"]["webhook_subscription"][];
    };
    /**
     * Paginated Workspace Permissions
     * @description A paginated list of workspace permissions.
     */
    paginated_workspace_access: {
      /**
       * Format: uri
       * @description Link to the next page if it exists. The last page of a collection does not have this value. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      next?: string;
      /** @description Page number of the current results. This is an optional element that is not provided in all responses. */
      page?: number;
      /** @description Current number of objects on the existing page. The default value is 10 with 100 being the maximum allowed value. Individual APIs may enforce different values. */
      pagelen?: number;
      /**
       * Format: uri
       * @description Link to previous page if it exists. A collections first page does not have this value. This is an optional element that is not provided in all responses. Some result sets strictly support forward navigation and never provide previous links. Clients must anticipate that backwards navigation is not always available. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      previous?: string;
      /** @description Total number of objects in the response. This is an optional element that is not provided in all responses, as it can be expensive to compute. */
      size?: number;
      values?: components["schemas"]["workspace_access"][];
    };
    /**
     * Paginated Workspace Memberships
     * @description A paginated list of workspace memberships.
     */
    paginated_workspace_memberships: {
      /**
       * Format: uri
       * @description Link to the next page if it exists. The last page of a collection does not have this value. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      next?: string;
      /** @description Page number of the current results. This is an optional element that is not provided in all responses. */
      page?: number;
      /** @description Current number of objects on the existing page. The default value is 10 with 100 being the maximum allowed value. Individual APIs may enforce different values. */
      pagelen?: number;
      /**
       * Format: uri
       * @description Link to previous page if it exists. A collections first page does not have this value. This is an optional element that is not provided in all responses. Some result sets strictly support forward navigation and never provide previous links. Clients must anticipate that backwards navigation is not always available. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      previous?: string;
      /** @description Total number of objects in the response. This is an optional element that is not provided in all responses, as it can be expensive to compute. */
      size?: number;
      values?: components["schemas"]["workspace_membership"][];
    };
    /**
     * Paginated Workspaces
     * @description A paginated list of workspaces.
     */
    paginated_workspaces: {
      /**
       * Format: uri
       * @description Link to the next page if it exists. The last page of a collection does not have this value. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      next?: string;
      /** @description Page number of the current results. This is an optional element that is not provided in all responses. */
      page?: number;
      /** @description Current number of objects on the existing page. The default value is 10 with 100 being the maximum allowed value. Individual APIs may enforce different values. */
      pagelen?: number;
      /**
       * Format: uri
       * @description Link to previous page if it exists. A collections first page does not have this value. This is an optional element that is not provided in all responses. Some result sets strictly support forward navigation and never provide previous links. Clients must anticipate that backwards navigation is not always available. Use this link to navigate the result set and refrain from constructing your own URLs.
       */
      previous?: string;
      /** @description Total number of objects in the response. This is an optional element that is not provided in all responses, as it can be expensive to compute. */
      size?: number;
      values?: components["schemas"]["workspace"][];
    };
    participant: {
      type: "participant";
    } & (Omit<components["schemas"]["object"], "type"> &
      ({
        approved?: boolean;
        /**
         * Format: date-time
         * @description The ISO8601 timestamp of the participant's action. For approvers, this is the time of their approval. For commenters and pull request reviewers who are not approvers, this is the time they last commented, or null if they have not commented.
         */
        participated_on?: string;
        /** @enum {string} */
        role?: "PARTICIPANT" | "REVIEWER";
        /** @enum {string} */
        state?: "approved" | "changes_requested" | null;
        user?: components["schemas"]["account"];
      } & {
        [key: string]: unknown;
      }));
    pipeline: {
      type: "pipeline";
    } & (Omit<components["schemas"]["object"], "type"> &
      ({
        /** @description The build number of the pipeline. */
        build_number?: number;
        /** @description The number of build seconds used by this pipeline. */
        build_seconds_used?: number;
        /**
         * Format: date-time
         * @description The timestamp when the Pipeline was completed. This is not set if the pipeline is still in progress.
         */
        completed_on?: string;
        /** @description An ordered list of sources of the pipeline configuration */
        configuration_sources?: components["schemas"]["pipeline_configuration_source"][];
        /**
         * Format: date-time
         * @description The timestamp when the pipeline was created.
         */
        created_on?: string;
        creator?: components["schemas"]["account"];
        links?: components["schemas"]["pipelines_pipeline_links"];
        repository?: components["schemas"]["repository"];
        state?: components["schemas"]["pipeline_state"];
        target?: components["schemas"]["pipeline_target"];
        trigger?: components["schemas"]["pipeline_trigger"];
        /** @description The UUID identifying the pipeline. */
        uuid?: string;
        /** @description The variables for the pipeline. */
        variables?: components["schemas"]["pipeline_variable"][];
      } & {
        [key: string]: unknown;
      }));
    pipeline_build_number: {
      type: "pipeline_build_number";
    } & (Omit<components["schemas"]["object"], "type"> &
      ({
        /** @description The next number that will be used as build number. */
        next?: number;
      } & {
        [key: string]: unknown;
      }));
    pipeline_cache: {
      type: "pipeline_cache";
    } & (Omit<components["schemas"]["object"], "type"> &
      ({
        /**
         * Format: date-time
         * @description The timestamp when the cache was created.
         */
        created_on?: string;
        /** @description The size of the file containing the archive of the cache. */
        file_size_bytes?: number;
        /** @description The key hash of the cache version. */
        key_hash?: string;
        /** @description The name of the cache. */
        name?: string;
        /** @description The path where the cache contents were retrieved from. */
        path?: string;
        /** @description The UUID of the pipeline that created the cache. */
        pipeline_uuid?: string;
        /** @description The uuid of the step that created the cache. */
        step_uuid?: string;
        /** @description The UUID identifying the pipeline cache. */
        uuid?: string;
      } & {
        [key: string]: unknown;
      }));
    /**
     * Pipeline Cache Content URI
     * @description A representation of the location of pipeline cache content.
     */
    pipeline_cache_content_uri: {
      /**
       * Format: uri
       * @description The uri for pipeline cache content.
       */
      uri?: string;
    };
    /**
     * Pipeline Command
     * @description An executable pipeline command.
     */
    pipeline_command: {
      /** @description The executable command. */
      command?: string;
      /** @description The name of the command. */
      name?: string;
    };
    pipeline_commit_target: {
      type: "pipeline_commit_target";
    } & (Omit<components["schemas"]["pipeline_target"], "type"> &
      ({
        commit?: components["schemas"]["commit"];
        selector?: components["schemas"]["pipeline_selector"];
      } & {
        [key: string]: unknown;
      }));
    /** @description Information about the source of the pipeline configuration */
    pipeline_configuration_source: {
      /** @description Identifier of the configuration source */
      source: string;
      /**
       * Format: uri
       * @description Link to the configuration source view or its immediate content
       */
      uri: string;
    };
    pipeline_error: {
      type: "pipeline_error";
    } & (Omit<components["schemas"]["object"], "type"> &
      ({
        /** @description The error key. */
        key?: string;
        /** @description The error message. */
        message?: string;
      } & {
        [key: string]: unknown;
      }));
    /**
     * Pipeline Image
     * @description The definition of a Docker image that can be used for a Bitbucket Pipelines step execution context.
     */
    pipeline_image: {
      /** @description The email needed to authenticate with the Docker registry. Only required when using a private Docker image. */
      email?: string;
      /** @description The name of the image. If the image is hosted on DockerHub the short name can be used, otherwise the fully qualified name is required here. */
      name?: string;
      /** @description The password needed to authenticate with the Docker registry. Only required when using a private Docker image. */
      password?: string;
      /** @description The username needed to authenticate with the Docker registry. Only required when using a private Docker image. */
      username?: string;
    };
    pipeline_known_host: {
      type: "pipeline_known_host";
    } & (Omit<components["schemas"]["object"], "type"> &
      ({
        /** @description The hostname of the known host. */
        hostname?: string;
        public_key?: components["schemas"]["pipeline_ssh_public_key"];
        /** @description The UUID identifying the known host. */
        uuid?: string;
      } & {
        [key: string]: unknown;
      }));
    pipeline_ref_target: {
      type: "pipeline_ref_target";
    } & (Omit<components["schemas"]["pipeline_target"], "type"> &
      ({
        commit?: components["schemas"]["commit"];
        /** @description The name of the reference. */
        ref_name?: string;
        /**
         * @description The type of reference (branch/tag).
         * @enum {string}
         */
        ref_type?: "branch" | "tag" | "named_branch" | "bookmark";
        selector?: components["schemas"]["pipeline_selector"];
      } & {
        [key: string]: unknown;
      }));
    pipeline_runner: {
      type: "pipeline_runner";
    } & (Omit<components["schemas"]["object"], "type"> &
      ({
        /**
         * Format: date-time
         * @description The timestamp when the runner was created.
         */
        created_on?: string;
        /** @description Labels assigned to the runner for identification and routing. */
        labels?: string[];
        /** @description The name of the runner. */
        name?: string;
        oauth_client?: components["schemas"]["pipeline_runner_oauth_client"];
        state?: components["schemas"]["pipeline_runner_state"];
        /**
         * Format: date-time
         * @description The timestamp when the runner was last updated.
         */
        updated_on?: string;
        /** @description The UUID identifying the runner. */
        uuid?: string;
      } & {
        [key: string]: unknown;
      }));
    pipeline_runner_oauth_client: {
      type: "pipeline_runner_oauth_client";
    } & (Omit<components["schemas"]["object"], "type"> &
      ({
        /** @description The intended audience for the OAuth token. */
        audience?: string;
        /** @description The OAuth client ID. */
        id?: string;
        /** @description The OAuth client secret. This is an optional element that is only provided once. */
        secret?: string;
        /**
         * Format: uri
         * @description The OAuth token endpoint URL.
         */
        token_endpoint?: string;
      } & {
        [key: string]: unknown;
      }));
    pipeline_runner_state: {
      type: "pipeline_runner_state";
    } & (Omit<components["schemas"]["object"], "type"> &
      ({
        /** @description Whether the runner is cordoned (prevented from accepting new steps). */
        cordoned?: boolean;
        /**
         * @description The current status of the runner.
         * @enum {string}
         */
        status?: "UNREGISTERED" | "ONLINE" | "OFFLINE" | "DISABLED" | "ENABLED" | "UNHEALTHY";
        /**
         * Format: date-time
         * @description The timestamp when the runner state was last updated.
         */
        updated_on?: string;
        version?: components["schemas"]["pipeline_runner_version"];
      } & {
        [key: string]: unknown;
      }));
    pipeline_runner_version: {
      type: "pipeline_runner_version";
    } & (Omit<components["schemas"]["object"], "type"> &
      ({
        /** @description The current recommended version of the runner. */
        current?: string;
        /** @description The currently installed version of the runner. */
        version?: string;
      } & {
        [key: string]: unknown;
      }));
    pipeline_schedule: {
      type: "pipeline_schedule";
    } & (Omit<components["schemas"]["object"], "type"> &
      ({
        /**
         * Format: date-time
         * @description The timestamp when the schedule was created.
         */
        created_on?: string;
        /** @description The cron expression with second precision (7 fields) that the schedule applies. For example, for expression: 0 0 12 * * ? *, will execute at 12pm UTC every day. */
        cron_pattern?: string;
        /** @description Whether the schedule is enabled. */
        enabled?: boolean;
        target?: components["schemas"]["pipeline_ref_target"];
        /**
         * Format: date-time
         * @description The timestamp when the schedule was updated.
         */
        updated_on?: string;
        /** @description The UUID identifying the schedule. */
        uuid?: string;
      } & {
        [key: string]: unknown;
      }));
    pipeline_schedule_execution: {
      type: "pipeline_schedule_execution";
    } & (Omit<components["schemas"]["object"], "type"> & {
      [key: string]: unknown;
    });
    pipeline_schedule_execution_errored: {
      type: "pipeline_schedule_execution_errored";
    } & (Omit<components["schemas"]["pipeline_schedule_execution"], "type"> &
      ({
        error?: components["schemas"]["pipeline_error"];
      } & {
        [key: string]: unknown;
      }));
    pipeline_schedule_execution_executed: {
      type: "pipeline_schedule_execution_executed";
    } & (Omit<components["schemas"]["pipeline_schedule_execution"], "type"> &
      ({
        pipeline?: components["schemas"]["pipeline"];
      } & {
        [key: string]: unknown;
      }));
    pipeline_schedule_post_request_body: {
      type: "pipeline_schedule_post_request_body";
    } & (Omit<components["schemas"]["object"], "type"> &
      ({
        /** @description The cron expression with second precision (7 fields) that the schedule applies. For example, for expression: 0 0 12 * * ? *, will execute at 12pm UTC every day. */
        cron_pattern: string;
        /** @description Whether the schedule is enabled. */
        enabled?: boolean;
        /** @description The target on which the schedule will be executed. */
        target: {
          /** @description The name of the reference. */
          ref_name: string;
          /**
           * @description The type of reference (branch only).
           * @enum {string}
           */
          ref_type: "branch";
          selector: components["schemas"]["pipeline_selector"];
        };
      } & {
        [key: string]: unknown;
      }));
    pipeline_schedule_put_request_body: {
      type: "pipeline_schedule_put_request_body";
    } & (Omit<components["schemas"]["object"], "type"> &
      ({
        /** @description Whether the schedule is enabled. */
        enabled?: boolean;
      } & {
        [key: string]: unknown;
      }));
    pipeline_selector: {
      type: "pipeline_selector";
    } & (Omit<components["schemas"]["object"], "type"> &
      ({
        /** @description The name of the matching pipeline definition. */
        pattern?: string;
        /**
         * @description The type of selector.
         * @enum {string}
         */
        type?: "branches" | "tags" | "bookmarks" | "default" | "custom";
      } & {
        [key: string]: unknown;
      }));
    pipeline_ssh_key_pair: {
      type: "pipeline_ssh_key_pair";
    } & (Omit<components["schemas"]["object"], "type"> &
      ({
        /** @description The SSH private key. This value will be empty when retrieving the SSH key pair. */
        private_key?: string;
        /** @description The SSH public key. */
        public_key?: string;
      } & {
        [key: string]: unknown;
      }));
    pipeline_ssh_public_key: {
      type: "pipeline_ssh_public_key";
    } & (Omit<components["schemas"]["object"], "type"> &
      ({
        /** @description The base64 encoded public key. */
        key?: string;
        /** @description The type of the public key. */
        key_type?: string;
        /** @description The MD5 fingerprint of the public key. */
        md5_fingerprint?: string;
        /** @description The SHA-256 fingerprint of the public key. */
        sha256_fingerprint?: string;
      } & {
        [key: string]: unknown;
      }));
    pipeline_state: {
      type: "pipeline_state";
    } & (Omit<components["schemas"]["object"], "type"> & {
      [key: string]: unknown;
    });
    pipeline_state_completed: {
      type: "pipeline_state_completed";
    } & (Omit<components["schemas"]["pipeline_state"], "type"> &
      ({
        /**
         * @description The name of pipeline state (COMPLETED).
         * @enum {string}
         */
        name?: "COMPLETED";
        result?: components["schemas"]["pipeline_state_completed_result"];
      } & {
        [key: string]: unknown;
      }));
    pipeline_state_completed_error: {
      type: "pipeline_state_completed_error";
    } & (Omit<components["schemas"]["pipeline_state_completed_result"], "type"> &
      ({
        error?: components["schemas"]["pipeline_error"];
        /**
         * @description The name of the result (ERROR)
         * @enum {string}
         */
        name?: "ERROR";
      } & {
        [key: string]: unknown;
      }));
    pipeline_state_completed_expired: {
      type: "pipeline_state_completed_expired";
    } & (Omit<components["schemas"]["pipeline_state_completed_result"], "type"> &
      ({
        /**
         * @description The name of the stopped result (EXPIRED).
         * @enum {string}
         */
        name?: "EXPIRED";
      } & {
        [key: string]: unknown;
      }));
    pipeline_state_completed_failed: {
      type: "pipeline_state_completed_failed";
    } & (Omit<components["schemas"]["pipeline_state_completed_result"], "type"> &
      ({
        /**
         * @description The name of the failed result (FAILED).
         * @enum {string}
         */
        name?: "FAILED";
      } & {
        [key: string]: unknown;
      }));
    pipeline_state_completed_result: {
      type: "pipeline_state_completed_result";
    } & (Omit<components["schemas"]["object"], "type"> & {
      [key: string]: unknown;
    });
    pipeline_state_completed_stopped: {
      type: "pipeline_state_completed_stopped";
    } & (Omit<components["schemas"]["pipeline_state_completed_result"], "type"> &
      ({
        /**
         * @description The name of the stopped result (STOPPED).
         * @enum {string}
         */
        name?: "STOPPED";
      } & {
        [key: string]: unknown;
      }));
    pipeline_state_completed_successful: {
      type: "pipeline_state_completed_successful";
    } & (Omit<components["schemas"]["pipeline_state_completed_result"], "type"> &
      ({
        /**
         * @description The name of the successful result (SUCCESSFUL).
         * @enum {string}
         */
        name?: "SUCCESSFUL";
      } & {
        [key: string]: unknown;
      }));
    pipeline_state_in_progress: {
      type: "pipeline_state_in_progress";
    } & (Omit<components["schemas"]["pipeline_state"], "type"> &
      ({
        /**
         * @description The name of pipeline state (IN_PROGRESS).
         * @enum {string}
         */
        name?: "IN_PROGRESS";
        stage?: components["schemas"]["pipeline_state_in_progress_stage"];
      } & {
        [key: string]: unknown;
      }));
    pipeline_state_in_progress_paused: {
      type: "pipeline_state_in_progress_paused";
    } & (Omit<components["schemas"]["pipeline_state_in_progress_stage"], "type"> &
      ({
        /**
         * @description The name of the stage (PAUSED)
         * @enum {string}
         */
        name?: "PAUSED";
      } & {
        [key: string]: unknown;
      }));
    pipeline_state_in_progress_running: {
      type: "pipeline_state_in_progress_running";
    } & (Omit<components["schemas"]["pipeline_state_in_progress_stage"], "type"> &
      ({
        /**
         * @description The name of the stage (RUNNING)
         * @enum {string}
         */
        name?: "RUNNING";
      } & {
        [key: string]: unknown;
      }));
    pipeline_state_in_progress_stage: {
      type: "pipeline_state_in_progress_stage";
    } & (Omit<components["schemas"]["object"], "type"> & {
      [key: string]: unknown;
    });
    pipeline_state_pending: {
      type: "pipeline_state_pending";
    } & (Omit<components["schemas"]["pipeline_state"], "type"> &
      ({
        /**
         * @description The name of pipeline state (PENDING).
         * @enum {string}
         */
        name?: "PENDING";
      } & {
        [key: string]: unknown;
      }));
    pipeline_step: {
      type: "pipeline_step";
    } & (Omit<components["schemas"]["object"], "type"> &
      ({
        /**
         * Format: date-time
         * @description The timestamp when the step execution was completed. This is not set if the step is still in progress.
         */
        completed_on?: string;
        image?: components["schemas"]["pipeline_image"];
        /** @description The list of build commands. These commands are executed in the build container. */
        script_commands?: components["schemas"]["pipeline_command"][];
        /** @description The list of commands that are executed as part of the setup phase of the build. These commands are executed outside the build container. */
        setup_commands?: components["schemas"]["pipeline_command"][];
        /**
         * Format: date-time
         * @description The timestamp when the step execution was started. This is not set when the step hasn't executed yet.
         */
        started_on?: string;
        state?: components["schemas"]["pipeline_step_state"];
        /** @description The UUID identifying the step. */
        uuid?: string;
      } & {
        [key: string]: unknown;
      }));
    pipeline_step_error: {
      type: "pipeline_step_error";
    } & (Omit<components["schemas"]["object"], "type"> &
      ({
        /** @description The error key. */
        key?: string;
        /** @description The error message. */
        message?: string;
      } & {
        [key: string]: unknown;
      }));
    pipeline_step_state: {
      type: "pipeline_step_state";
    } & (Omit<components["schemas"]["object"], "type"> & {
      [key: string]: unknown;
    });
    pipeline_step_state_completed: {
      type: "pipeline_step_state_completed";
    } & (Omit<components["schemas"]["pipeline_step_state"], "type"> &
      ({
        /**
         * @description The name of pipeline step state (COMPLETED).
         * @enum {string}
         */
        name?: "COMPLETED";
        result?: components["schemas"]["pipeline_step_state_completed_result"];
      } & {
        [key: string]: unknown;
      }));
    pipeline_step_state_completed_error: {
      type: "pipeline_step_state_completed_error";
    } & (Omit<components["schemas"]["pipeline_step_state_completed_result"], "type"> &
      ({
        error?: components["schemas"]["pipeline_step_error"];
        /**
         * @description The name of the result (ERROR)
         * @enum {string}
         */
        name?: "ERROR";
      } & {
        [key: string]: unknown;
      }));
    pipeline_step_state_completed_expired: {
      type: "pipeline_step_state_completed_expired";
    } & (Omit<components["schemas"]["pipeline_step_state_completed_result"], "type"> &
      ({
        /**
         * @description The name of the result (EXPIRED)
         * @enum {string}
         */
        name?: "EXPIRED";
      } & {
        [key: string]: unknown;
      }));
    pipeline_step_state_completed_failed: {
      type: "pipeline_step_state_completed_failed";
    } & (Omit<components["schemas"]["pipeline_step_state_completed_result"], "type"> &
      ({
        /**
         * @description The name of the result (FAILED)
         * @enum {string}
         */
        name?: "FAILED";
      } & {
        [key: string]: unknown;
      }));
    pipeline_step_state_completed_not_run: {
      type: "pipeline_step_state_completed_not_run";
    } & (Omit<components["schemas"]["pipeline_step_state_completed_result"], "type"> &
      ({
        /**
         * @description The name of the result (NOT_RUN)
         * @enum {string}
         */
        name?: "NOT_RUN";
      } & {
        [key: string]: unknown;
      }));
    pipeline_step_state_completed_result: {
      type: "pipeline_step_state_completed_result";
    } & (Omit<components["schemas"]["object"], "type"> & {
      [key: string]: unknown;
    });
    pipeline_step_state_completed_stopped: {
      type: "pipeline_step_state_completed_stopped";
    } & (Omit<components["schemas"]["pipeline_step_state_completed_result"], "type"> &
      ({
        /**
         * @description The name of the result (STOPPED)
         * @enum {string}
         */
        name?: "STOPPED";
      } & {
        [key: string]: unknown;
      }));
    pipeline_step_state_completed_successful: {
      type: "pipeline_step_state_completed_successful";
    } & (Omit<components["schemas"]["pipeline_step_state_completed_result"], "type"> &
      ({
        /**
         * @description The name of the result (SUCCESSFUL)
         * @enum {string}
         */
        name?: "SUCCESSFUL";
      } & {
        [key: string]: unknown;
      }));
    pipeline_step_state_in_progress: {
      type: "pipeline_step_state_in_progress";
    } & (Omit<components["schemas"]["pipeline_step_state"], "type"> &
      ({
        /**
         * @description The name of pipeline step state (IN_PROGRESS).
         * @enum {string}
         */
        name?: "IN_PROGRESS";
      } & {
        [key: string]: unknown;
      }));
    pipeline_step_state_pending: {
      type: "pipeline_step_state_pending";
    } & (Omit<components["schemas"]["pipeline_step_state"], "type"> &
      ({
        /**
         * @description The name of pipeline step state (PENDING).
         * @enum {string}
         */
        name?: "PENDING";
      } & {
        [key: string]: unknown;
      }));
    pipeline_step_state_ready: {
      type: "pipeline_step_state_ready";
    } & (Omit<components["schemas"]["pipeline_step_state"], "type"> &
      ({
        /**
         * @description The name of pipeline step state (READY).
         * @enum {string}
         */
        name?: "READY";
      } & {
        [key: string]: unknown;
      }));
    pipeline_target: {
      type: "pipeline_target";
    } & (Omit<components["schemas"]["object"], "type"> & {
      [key: string]: unknown;
    });
    pipeline_trigger: {
      type: "pipeline_trigger";
    } & (Omit<components["schemas"]["object"], "type"> & {
      [key: string]: unknown;
    });
    pipeline_trigger_manual: {
      type: "pipeline_trigger_manual";
    } & (Omit<components["schemas"]["pipeline_trigger"], "type"> & {
      [key: string]: unknown;
    });
    pipeline_trigger_push: {
      type: "pipeline_trigger_push";
    } & (Omit<components["schemas"]["pipeline_trigger"], "type"> & {
      [key: string]: unknown;
    });
    pipeline_variable: {
      type: "pipeline_variable";
    } & (Omit<components["schemas"]["object"], "type"> &
      ({
        /** @description The unique name of the variable. */
        key?: string;
        /** @description If true, this variable will be treated as secured. The value will never be exposed in the logs or the REST API. */
        secured?: boolean;
        /** @description The UUID identifying the variable. */
        uuid?: string;
        /** @description The value of the variable. If the variable is secured, this will be empty. */
        value?: string;
      } & {
        [key: string]: unknown;
      }));
    pipelines_config: {
      type: "pipelines_config";
    } & (Omit<components["schemas"]["object"], "type"> &
      ({
        /** @description Whether Pipelines is enabled for the repository. */
        enabled?: boolean;
        repository?: components["schemas"]["repository"];
      } & {
        [key: string]: unknown;
      }));
    pipelines_links_section_href: {
      type: "pipelines_links_section_href";
    } & (Omit<components["schemas"]["object"], "type"> &
      ({
        /**
         * Format: uri
         * @description A link
         */
        href?: string;
      } & {
        [key: string]: unknown;
      }));
    pipelines_pipeline_links: {
      type: "pipelines_pipeline_links";
    } & (Omit<components["schemas"]["object"], "type"> &
      ({
        self?: components["schemas"]["pipelines_links_section_href"];
        steps?: components["schemas"]["pipelines_links_section_href"];
      } & {
        [key: string]: unknown;
      }));
    project: {
      type: "project";
    } & (Omit<components["schemas"]["object"], "type"> &
      ({
        /** Format: date-time */
        created_on?: string;
        description?: string;
        /**
         * @description Indicates whether the project contains publicly visible repositories.
         *     Note that private projects cannot contain public repositories.
         */
        has_publicly_visible_repos?: boolean;
        /**
         * @description Indicates whether the project is publicly accessible, or whether it is
         *     private to the team and consequently only visible to team members.
         *     Note that private projects cannot contain public repositories.
         */
        is_private?: boolean;
        /** @description The project's key. */
        key?: string;
        links?: {
          /**
           * Link
           * @description A link to a resource related to this object.
           */
          avatar?: {
            /** Format: uri */
            href?: string;
            name?: string;
          };
          /**
           * Link
           * @description A link to a resource related to this object.
           */
          html?: {
            /** Format: uri */
            href?: string;
            name?: string;
          };
        };
        /** @description The name of the project. */
        name?: string;
        owner?: components["schemas"]["team"];
        /** Format: date-time */
        updated_on?: string;
        /** @description The project's immutable id. */
        uuid?: string;
      } & {
        [key: string]: unknown;
      }));
    project_branching_model: {
      type: "project_branching_model";
    } & (Omit<components["schemas"]["object"], "type"> &
      ({
        /** @description The active branch types. */
        branch_types?: {
          /**
           * @description The kind of branch.
           * @enum {string}
           */
          kind: "feature" | "bugfix" | "release" | "hotfix";
          /** @description The prefix for this branch type. A branch with this prefix will be classified as per `kind`. The prefix must be a valid prefix for a branch and must always exist. It cannot be blank, empty or `null`. */
          prefix: string;
        }[];
        development?: {
          /** @description Name of the target branch. If inherited by a repository, it will default to the main branch if the specified branch does not exist. */
          name: string;
          /** @description Indicates if the setting points at an explicit branch (`false`) or tracks the main branch (`true`). */
          use_mainbranch: boolean;
        };
        production?: {
          /** @description Name of the target branch. If inherited by a repository, it will default to the main branch if the specified branch does not exist. */
          name: string;
          /** @description Indicates if the setting points at an explicit branch (`false`) or tracks the main branch (`true`). */
          use_mainbranch: boolean;
        };
      } & {
        [key: string]: unknown;
      }));
    project_deploy_key: {
      type: "project_deploy_key";
    } & (Omit<components["schemas"]["object"], "type"> &
      ({
        /** Format: date-time */
        added_on?: string;
        /** @description The comment parsed from the deploy key (if present) */
        comment?: string;
        created_by?: components["schemas"]["account"];
        /** @description The deploy key value. */
        key?: string;
        /** @description The user-defined label for the deploy key */
        label?: string;
        /** Format: date-time */
        last_used?: string;
        links?: {
          /**
           * Link
           * @description A link to a resource related to this object.
           */
          self?: {
            /** Format: uri */
            href?: string;
            name?: string;
          };
        };
        project?: components["schemas"]["project"];
      } & {
        [key: string]: unknown;
      }));
    /**
     * Project Group Permission
     * @description A group's permission for a given project.
     */
    project_group_permission: {
      group?: components["schemas"]["group"];
      links?: {
        /**
         * Link
         * @description A link to a resource related to this object.
         */
        self?: {
          /** Format: uri */
          href?: string;
          name?: string;
        };
      };
      /** @enum {string} */
      permission?: "read" | "write" | "create-repo" | "admin" | "none";
      project?: components["schemas"]["project"];
      type: string;
    } & {
      [key: string]: unknown;
    };
    /**
     * Project User Permission
     * @description A user's direct permission for a given project.
     */
    project_user_permission: {
      links?: {
        /**
         * Link
         * @description A link to a resource related to this object.
         */
        self?: {
          /** Format: uri */
          href?: string;
          name?: string;
        };
      };
      /** @enum {string} */
      permission?: "read" | "write" | "create-repo" | "admin" | "none";
      project?: components["schemas"]["project"];
      type: string;
      user?: components["schemas"]["user"];
    } & {
      [key: string]: unknown;
    };
    pullrequest: {
      type: "pullrequest";
    } & (Omit<components["schemas"]["object"], "type"> &
      ({
        author?: components["schemas"]["account"];
        /** @description A boolean flag indicating if merging the pull request closes the source branch. */
        close_source_branch?: boolean;
        closed_by?: components["schemas"]["account"];
        /** @description The number of comments for a specific pull request. */
        comment_count?: number;
        /**
         * Format: date-time
         * @description The ISO8601 timestamp the request was created.
         */
        created_on?: string;
        destination?: components["schemas"]["pullrequest_endpoint"];
        /** @description A boolean flag indicating whether the pull request is a draft. */
        draft?: boolean;
        /** @description The pull request's unique ID. Note that pull request IDs are only unique within their associated repository. */
        id?: number;
        links?: {
          /**
           * Link
           * @description A link to a resource related to this object.
           */
          activity?: {
            /** Format: uri */
            href?: string;
            name?: string;
          };
          /**
           * Link
           * @description A link to a resource related to this object.
           */
          approve?: {
            /** Format: uri */
            href?: string;
            name?: string;
          };
          /**
           * Link
           * @description A link to a resource related to this object.
           */
          comments?: {
            /** Format: uri */
            href?: string;
            name?: string;
          };
          /**
           * Link
           * @description A link to a resource related to this object.
           */
          commits?: {
            /** Format: uri */
            href?: string;
            name?: string;
          };
          /**
           * Link
           * @description A link to a resource related to this object.
           */
          decline?: {
            /** Format: uri */
            href?: string;
            name?: string;
          };
          /**
           * Link
           * @description A link to a resource related to this object.
           */
          diff?: {
            /** Format: uri */
            href?: string;
            name?: string;
          };
          /**
           * Link
           * @description A link to a resource related to this object.
           */
          diffstat?: {
            /** Format: uri */
            href?: string;
            name?: string;
          };
          /**
           * Link
           * @description A link to a resource related to this object.
           */
          html?: {
            /** Format: uri */
            href?: string;
            name?: string;
          };
          /**
           * Link
           * @description A link to a resource related to this object.
           */
          merge?: {
            /** Format: uri */
            href?: string;
            name?: string;
          };
          /**
           * Link
           * @description A link to a resource related to this object.
           */
          self?: {
            /** Format: uri */
            href?: string;
            name?: string;
          };
        };
        /** Pull Request Commit */
        merge_commit?: {
          hash?: string;
        };
        /**
         * @description The list of users that are collaborating on this pull request.
         *             Collaborators are user that:
         *
         *             * are added to the pull request as a reviewer (part of the reviewers
         *               list)
         *             * are not explicit reviewers, but have commented on the pull request
         *             * are not explicit reviewers, but have approved the pull request
         *
         *             Each user is wrapped in an object that indicates the user's role and
         *             whether they have approved the pull request. For performance reasons,
         *             the API only returns this list when an API requests a pull request by
         *             id.
         */
        participants?: components["schemas"]["participant"][];
        /** @description A boolean flag indicating whether the pull request is queued */
        queued?: boolean;
        /** @description Explains why a pull request was declined. This field is only applicable to pull requests in rejected state. */
        reason?: string;
        /**
         * Rendered Pull Request Markup
         * @description User provided pull request text, interpreted in a markup language and rendered in HTML
         */
        rendered?: {
          description?: {
            /** @description The user's content rendered as HTML. */
            html?: string;
            /**
             * @description The type of markup language the raw content is to be interpreted in.
             * @enum {string}
             */
            markup?: "markdown" | "creole" | "plaintext";
            /** @description The text as it was typed by a user. */
            raw?: string;
          };
          reason?: {
            /** @description The user's content rendered as HTML. */
            html?: string;
            /**
             * @description The type of markup language the raw content is to be interpreted in.
             * @enum {string}
             */
            markup?: "markdown" | "creole" | "plaintext";
            /** @description The text as it was typed by a user. */
            raw?: string;
          };
          title?: {
            /** @description The user's content rendered as HTML. */
            html?: string;
            /**
             * @description The type of markup language the raw content is to be interpreted in.
             * @enum {string}
             */
            markup?: "markdown" | "creole" | "plaintext";
            /** @description The text as it was typed by a user. */
            raw?: string;
          };
        };
        /** @description The list of users that were added as reviewers on this pull request when it was created. For performance reasons, the API only includes this list on a pull request's `self` URL. */
        reviewers?: components["schemas"]["account"][];
        source?: components["schemas"]["pullrequest_endpoint"];
        /**
         * @description The pull request's current status.
         * @enum {string}
         */
        state?: "OPEN" | "MERGED" | "DECLINED" | "SUPERSEDED";
        summary?: {
          /** @description The user's content rendered as HTML. */
          html?: string;
          /**
           * @description The type of markup language the raw content is to be interpreted in.
           * @enum {string}
           */
          markup?: "markdown" | "creole" | "plaintext";
          /** @description The text as it was typed by a user. */
          raw?: string;
        };
        /** @description The number of open tasks for a specific pull request. */
        task_count?: number;
        /** @description Title of the pull request. */
        title?: string;
        /**
         * Format: date-time
         * @description The ISO8601 timestamp the request was last updated.
         */
        updated_on?: string;
      } & {
        [key: string]: unknown;
      }));
    pullrequest_comment: {
      type: "pullrequest_comment";
    } & (Omit<components["schemas"]["comment"], "type"> &
      ({
        pending?: boolean;
        pullrequest?: components["schemas"]["pullrequest"];
        resolution?: components["schemas"]["comment_resolution"];
      } & {
        [key: string]: unknown;
      }));
    pullrequest_comment_task: components["schemas"]["pullrequest_task"] & {
      comment?: components["schemas"]["comment"];
    };
    /** Pull Request Endpoint */
    pullrequest_endpoint: {
      /** Pull Request Branch */
      branch?: {
        /** @description The default merge strategy, when this endpoint is the destination of the pull request. */
        default_merge_strategy?: string;
        /** @description Available merge strategies, when this endpoint is the destination of the pull request. */
        merge_strategies?: (
          | "merge_commit"
          | "squash"
          | "fast_forward"
          | "squash_fast_forward"
          | "rebase_fast_forward"
          | "rebase_merge"
        )[];
        name?: string;
      };
      /** Pull Request Commit */
      commit?: {
        hash?: string;
      };
      repository?: components["schemas"]["repository"];
    };
    /**
     * Pull Request Merge Parameters
     * @description The metadata that describes a pull request merge.
     */
    pullrequest_merge_parameters: {
      /** @description Whether the source branch should be deleted. If this is not provided, we fallback to the value used when the pull request was created, which defaults to False */
      close_source_branch?: boolean;
      /**
       * @description The merge strategy that will be used to merge the pull request.
       * @default merge_commit
       * @enum {string}
       */
      merge_strategy?:
        | "merge_commit"
        | "squash"
        | "fast_forward"
        | "squash_fast_forward"
        | "rebase_fast_forward"
        | "rebase_merge";
      /** @description The commit message that will be used on the resulting commit. Note that the size of the message is limited to 128 KiB. */
      message?: string;
      type: string;
    } & {
      [key: string]: unknown;
    };
    pullrequest_task: components["schemas"]["task"] & {
      links?: {
        /**
         * Link
         * @description A link to a resource related to this object.
         */
        html?: {
          /** Format: uri */
          href?: string;
          name?: string;
        };
        /**
         * Link
         * @description A link to a resource related to this object.
         */
        self?: {
          /** Format: uri */
          href?: string;
          name?: string;
        };
      };
    };
    /**
     * Pull Request Task Create
     * @description A pullrequest task create
     */
    pullrequest_task_create: {
      comment?: components["schemas"]["comment"];
      /**
       * Task Raw Content
       * @description task raw content
       */
      content: {
        /** @description The task contents */
        raw: string;
      };
      pending?: boolean;
    };
    /**
     * Pull Request Task Update
     * @description A pullrequest task update
     */
    pullrequest_task_update: {
      /**
       * Task Raw Content
       * @description task raw content
       */
      content?: {
        /** @description The task contents */
        raw: string;
      };
      /** @enum {string} */
      state?: "RESOLVED" | "UNRESOLVED";
    };
    /**
     * Ref
     * @description A ref object, representing a branch or tag in a repository.
     */
    ref: {
      links?: {
        /**
         * Link
         * @description A link to a resource related to this object.
         */
        commits?: {
          /** Format: uri */
          href?: string;
          name?: string;
        };
        /**
         * Link
         * @description A link to a resource related to this object.
         */
        html?: {
          /** Format: uri */
          href?: string;
          name?: string;
        };
        /**
         * Link
         * @description A link to a resource related to this object.
         */
        self?: {
          /** Format: uri */
          href?: string;
          name?: string;
        };
      };
      /** @description The name of the ref. */
      name?: string;
      target?: components["schemas"]["commit"];
      type: string;
    } & {
      [key: string]: unknown;
    };
    report: {
      type: "report";
    } & (Omit<components["schemas"]["object"], "type"> &
      ({
        /**
         * Format: date-time
         * @description The timestamp when the report was created.
         */
        created_on?: string;
        /** @description An array of data fields to display information on the report. Maximum 10. */
        data?: components["schemas"]["report_data"][];
        /** @description A string to describe the purpose of the report. */
        details?: string;
        /** @description ID of the report provided by the report creator. It can be used to identify the report as an alternative to it's generated uuid. It is not used by Bitbucket, but only by the report creator for updating or deleting this specific report. Needs to be unique. */
        external_id?: string;
        /**
         * Format: uri
         * @description A URL linking to the results of the report in an external tool.
         */
        link?: string;
        /**
         * Format: uri
         * @description A URL to the report logo. If none is provided, the default insights logo will be used.
         */
        logo_url?: string;
        /** @description If enabled, a remote link is created in Jira for the work item associated with the commit the report belongs to. */
        remote_link_enabled?: boolean;
        /**
         * @description The type of the report.
         * @enum {string}
         */
        report_type?: "SECURITY" | "COVERAGE" | "TEST" | "BUG";
        /** @description A string to describe the tool or company who created the report. */
        reporter?: string;
        /**
         * @description The state of the report. May be set to PENDING and later updated.
         * @enum {string}
         */
        result?: "PASSED" | "FAILED" | "PENDING";
        /** @description The title of the report. */
        title?: string;
        /**
         * Format: date-time
         * @description The timestamp when the report was updated.
         */
        updated_on?: string;
        /** @description The UUID that can be used to identify the report. */
        uuid?: string;
      } & {
        [key: string]: unknown;
      }));
    report_annotation: {
      type: "report_annotation";
    } & (Omit<components["schemas"]["object"], "type"> &
      ({
        /**
         * @description The type of the report.
         * @enum {string}
         */
        annotation_type?: "VULNERABILITY" | "CODE_SMELL" | "BUG";
        /**
         * Format: date-time
         * @description The timestamp when the report was created.
         */
        created_on?: string;
        /** @description The details to show to users when clicking on the annotation. */
        details?: string;
        /** @description ID of the annotation provided by the annotation creator. It can be used to identify the annotation as an alternative to it's generated uuid. It is not used by Bitbucket, but only by the annotation creator for updating or deleting this specific annotation. Needs to be unique. */
        external_id?: string;
        /** @description The line number that the annotation should belong to. If no line number is provided, then it will default to 0 and in a pull request it will appear at the top of the file specified by the path field. */
        line?: number;
        /**
         * Format: uri
         * @description A URL linking to the annotation in an external tool.
         */
        link?: string;
        /** @description The path of the file on which this annotation should be placed. This is the path of the file relative to the git repository. If no path is provided, then it will appear in the overview modal on all pull requests where the tip of the branch is the given commit, regardless of which files were modified. */
        path?: string;
        /**
         * @description The state of the report. May be set to PENDING and later updated.
         * @enum {string}
         */
        result?: "PASSED" | "FAILED" | "SKIPPED" | "IGNORED";
        /**
         * @description The severity of the annotation.
         * @enum {string}
         */
        severity?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
        /** @description The message to display to users. */
        summary?: string;
        /**
         * Format: date-time
         * @description The timestamp when the report was updated.
         */
        updated_on?: string;
        /** @description The UUID that can be used to identify the annotation. */
        uuid?: string;
      } & {
        [key: string]: unknown;
      }));
    /**
     * Report Data
     * @description A key-value element that will be displayed along with the report.
     */
    report_data: {
      /** @description A string describing what this data field represents. */
      title?: string;
      /**
       * @description The type of data contained in the value field. If not provided, then the value will be detected as a boolean, number or string.
       * @enum {string}
       */
      type?: "BOOLEAN" | "DATE" | "DURATION" | "LINK" | "NUMBER" | "PERCENTAGE" | "TEXT";
      /** @description The value of the data element. */
      value?: Record<string, never>;
    };
    repository: {
      type: "repository";
    } & (Omit<components["schemas"]["object"], "type"> &
      ({
        /** Format: date-time */
        created_on?: string;
        description?: string;
        /**
         * @description Controls the rules for forking this repository.
         *
         *     * **allow_forks**: unrestricted forking
         *     * **no_public_forks**: restrict forking to private forks (forks cannot
         *       be made public later)
         *     * **no_forks**: deny all forking
         * @enum {string}
         */
        fork_policy?: "allow_forks" | "no_public_forks" | "no_forks";
        /** @description The concatenation of the repository owner's username and the slugified name, e.g. "evzijst/interruptingcow". This is the same string used in Bitbucket URLs. */
        full_name?: string;
        /**
         * @description The issue tracker for this repository is enabled. Issue Tracker
         *     features are not supported for repositories in workspaces
         *     administered through admin.atlassian.com.
         */
        has_issues?: boolean;
        /**
         * @description The wiki for this repository is enabled. Wiki
         *     features are not supported for repositories in workspaces
         *     administered through admin.atlassian.com.
         */
        has_wiki?: boolean;
        is_private?: boolean;
        language?: string;
        links?: {
          /**
           * Link
           * @description A link to a resource related to this object.
           */
          avatar?: {
            /** Format: uri */
            href?: string;
            name?: string;
          };
          clone?: {
            /** Format: uri */
            href?: string;
            name?: string;
          }[];
          /**
           * Link
           * @description A link to a resource related to this object.
           */
          commits?: {
            /** Format: uri */
            href?: string;
            name?: string;
          };
          /**
           * Link
           * @description A link to a resource related to this object.
           */
          downloads?: {
            /** Format: uri */
            href?: string;
            name?: string;
          };
          /**
           * Link
           * @description A link to a resource related to this object.
           */
          forks?: {
            /** Format: uri */
            href?: string;
            name?: string;
          };
          /**
           * Link
           * @description A link to a resource related to this object.
           */
          hooks?: {
            /** Format: uri */
            href?: string;
            name?: string;
          };
          /**
           * Link
           * @description A link to a resource related to this object.
           */
          html?: {
            /** Format: uri */
            href?: string;
            name?: string;
          };
          /**
           * Link
           * @description A link to a resource related to this object.
           */
          pullrequests?: {
            /** Format: uri */
            href?: string;
            name?: string;
          };
          /**
           * Link
           * @description A link to a resource related to this object.
           */
          self?: {
            /** Format: uri */
            href?: string;
            name?: string;
          };
          /**
           * Link
           * @description A link to a resource related to this object.
           */
          watchers?: {
            /** Format: uri */
            href?: string;
            name?: string;
          };
        };
        mainbranch?: components["schemas"]["branch"];
        name?: string;
        owner?: components["schemas"]["account"];
        parent?: components["schemas"]["repository"];
        project?: components["schemas"]["project"];
        /** @enum {string} */
        scm?: "git";
        size?: number;
        /** Format: date-time */
        updated_on?: string;
        /** @description The repository's immutable id. This can be used as a substitute for the slug segment in URLs. Doing this guarantees your URLs will survive renaming of the repository by its owner, or even transfer of the repository to a different user. */
        uuid?: string;
      } & {
        [key: string]: unknown;
      }));
    /**
     * Repository Group Permission
     * @description A group's permission for a given repository.
     */
    repository_group_permission: {
      group?: components["schemas"]["group"];
      links?: {
        /**
         * Link
         * @description A link to a resource related to this object.
         */
        self?: {
          /** Format: uri */
          href?: string;
          name?: string;
        };
      };
      /** @enum {string} */
      permission?: "read" | "write" | "admin" | "none";
      repository?: components["schemas"]["repository"];
      type: string;
    } & {
      [key: string]: unknown;
    };
    /**
     * Repository Inheritance State
     * @description A json object representing the repository's inheritance state values
     */
    repository_inheritance_state: {
      override_settings?: Record<string, never>;
      type: string;
    } & {
      [key: string]: unknown;
    };
    /**
     * Repository Permission
     * @description A user's permission for a given repository.
     */
    repository_permission: {
      /** @enum {string} */
      permission?: "read" | "write" | "admin" | "none";
      repository?: components["schemas"]["repository"];
      type: string;
      user?: components["schemas"]["user"];
    } & {
      [key: string]: unknown;
    };
    /**
     * Repository User Permission
     * @description A user's direct permission for a given repository.
     */
    repository_user_permission: {
      links?: {
        /**
         * Link
         * @description A link to a resource related to this object.
         */
        self?: {
          /** Format: uri */
          href?: string;
          name?: string;
        };
      };
      /** @enum {string} */
      permission?: "read" | "write" | "admin" | "none";
      repository?: components["schemas"]["repository"];
      type: string;
      user?: components["schemas"]["user"];
    } & {
      [key: string]: unknown;
    };
    search_code_search_result: {
      /** Format: int64 */
      readonly content_match_count?: number;
      readonly content_matches?: components["schemas"]["search_content_match"][];
      file?: components["schemas"]["commit_file"];
      readonly path_matches?: components["schemas"]["search_segment"][];
      readonly type?: string;
    };
    search_content_match: {
      readonly lines?: components["schemas"]["search_line"][];
    };
    search_line: {
      /** Format: int32 */
      readonly line?: number;
      readonly segments?: components["schemas"]["search_segment"][];
    };
    search_result_page: {
      /** Format: uri */
      readonly next?: string;
      /** Format: int32 */
      readonly page?: number;
      /** Format: int32 */
      readonly pagelen?: number;
      /** Format: uri */
      readonly previous?: string;
      readonly query_substituted?: boolean;
      /** Format: int64 */
      readonly size?: number;
      readonly values?: components["schemas"]["search_code_search_result"][];
    };
    search_segment: {
      readonly match?: boolean;
      readonly text?: string;
    };
    snippet: {
      type: "snippet";
    } & (Omit<components["schemas"]["object"], "type"> &
      ({
        /** Format: date-time */
        created_on?: string;
        creator?: components["schemas"]["account"];
        id?: number;
        is_private?: boolean;
        owner?: components["schemas"]["account"];
        /**
         * @description The DVCS used to store the snippet.
         * @enum {string}
         */
        scm?: "git";
        title?: string;
        /** Format: date-time */
        updated_on?: string;
      } & {
        [key: string]: unknown;
      }));
    snippet_comment: {
      type: "snippet_comment";
    } & (Omit<components["schemas"]["object"], "type"> &
      ({
        links?: {
          /**
           * Link
           * @description A link to a resource related to this object.
           */
          html?: {
            /** Format: uri */
            href?: string;
            name?: string;
          };
          /**
           * Link
           * @description A link to a resource related to this object.
           */
          self?: {
            /** Format: uri */
            href?: string;
            name?: string;
          };
        };
        snippet?: components["schemas"]["snippet"];
      } & {
        [key: string]: unknown;
      }));
    snippet_commit: {
      type: "snippet_commit";
    } & (Omit<components["schemas"]["base_commit"], "type"> &
      ({
        links?: {
          /**
           * Link
           * @description A link to a resource related to this object.
           */
          diff?: {
            /** Format: uri */
            href?: string;
            name?: string;
          };
          /**
           * Link
           * @description A link to a resource related to this object.
           */
          html?: {
            /** Format: uri */
            href?: string;
            name?: string;
          };
          /**
           * Link
           * @description A link to a resource related to this object.
           */
          self?: {
            /** Format: uri */
            href?: string;
            name?: string;
          };
        };
        snippet?: components["schemas"]["snippet"];
      } & {
        [key: string]: unknown;
      }));
    ssh_account_key: {
      type: "ssh_account_key";
    } & (Omit<components["schemas"]["ssh_key"], "type"> &
      ({
        /** Format: date-time */
        expires_on?: string;
        /** @description The SSH key fingerprint in SHA-256 format. */
        fingerprint?: string;
        owner?: components["schemas"]["account"];
      } & {
        [key: string]: unknown;
      }));
    ssh_key: {
      type: "ssh_key";
    } & (Omit<components["schemas"]["object"], "type"> &
      ({
        /** @description The comment parsed from the SSH key (if present) */
        comment?: string;
        /** Format: date-time */
        created_on?: string;
        /** @description The SSH public key value in OpenSSH format. */
        key?: string;
        /** @description The user-defined label for the SSH key */
        label?: string;
        /** Format: date-time */
        last_used?: string;
        links?: {
          /**
           * Link
           * @description A link to a resource related to this object.
           */
          self?: {
            /** Format: uri */
            href?: string;
            name?: string;
          };
        };
        /** @description The SSH key's immutable ID. */
        uuid?: string;
      } & {
        [key: string]: unknown;
      }));
    /**
     * Subject Types
     * @description The mapping of resource/subject types pointing to their individual event types.
     */
    subject_types: {
      repository?: {
        /**
         * Link
         * @description A link to a resource related to this object.
         */
        events?: {
          /** Format: uri */
          href?: string;
          name?: string;
        };
      };
      workspace?: {
        /**
         * Link
         * @description A link to a resource related to this object.
         */
        events?: {
          /** Format: uri */
          href?: string;
          name?: string;
        };
      };
    };
    tag: components["schemas"]["ref"] &
      ({
        /**
         * Format: date-time
         * @description The date that the tag was created, if available
         */
        date?: string;
        /** @description The message associated with the tag, if available. */
        message?: string;
        tagger?: components["schemas"]["author"];
      } & {
        [key: string]: unknown;
      });
    /**
     * Task
     * @description A task object.
     */
    task: {
      content: {
        /** @description The user's content rendered as HTML. */
        html?: string;
        /**
         * @description The type of markup language the raw content is to be interpreted in.
         * @enum {string}
         */
        markup?: "markdown" | "creole" | "plaintext";
        /** @description The text as it was typed by a user. */
        raw?: string;
      };
      /** Format: date-time */
      created_on: string;
      creator: components["schemas"]["account"];
      /** Format: int64 */
      id?: number;
      pending?: boolean;
      resolved_by?: components["schemas"]["account"];
      /**
       * Format: date-time
       * @description The ISO8601 timestamp for when the task was resolved.
       */
      resolved_on?: string;
      /** @enum {string} */
      state: "RESOLVED" | "UNRESOLVED";
      /** Format: date-time */
      updated_on: string;
    };
    team: {
      type: "team";
    } & (Omit<components["schemas"]["account"], "type"> &
      ({
        links?: components["schemas"]["team_links"];
      } & {
        [key: string]: unknown;
      }));
    team_links: components["schemas"]["account_links"] &
      ({
        html?: components["schemas"]["link"];
        members?: components["schemas"]["link"];
        projects?: components["schemas"]["link"];
        repositories?: components["schemas"]["link"];
        self?: components["schemas"]["link"];
      } & {
        [key: string]: unknown;
      });
    /**
     * Tree Entry
     * @description Base type for most resource objects. It defines the common `type` element that identifies an object's type. It also identifies the element as Swagger's `discriminator`.
     */
    treeentry: {
      commit?: components["schemas"]["commit"];
      /** @description The path in the repository */
      path?: string;
      type: string;
    } & {
      [key: string]: unknown;
    };
    user: {
      type: "user";
    } & (Omit<components["schemas"]["account"], "type"> &
      ({
        /** @description The user's Atlassian account ID. */
        account_id?: string;
        /** @description The status of the account. Currently the only possible value is "active", but more values may be added in the future. */
        account_status?: string;
        has_2fa_enabled?: boolean;
        is_staff?: boolean;
        links?: components["schemas"]["user_links"];
        /** @description Account name defined by the owner. Should be used instead of the "username" field. Note that "nickname" cannot be used in place of "username" in URLs and queries, as "nickname" is not guaranteed to be unique. */
        nickname?: string;
      } & {
        [key: string]: unknown;
      }));
    user_links: components["schemas"]["account_links"] &
      ({
        html?: components["schemas"]["link"];
        repositories?: components["schemas"]["link"];
        self?: components["schemas"]["link"];
      } & {
        [key: string]: unknown;
      });
    webhook_subscription: {
      type: "webhook_subscription";
    } & (Omit<components["schemas"]["object"], "type"> &
      ({
        active?: boolean;
        /** Format: date-time */
        created_at?: string;
        /** @description A user-defined description of the webhook. */
        description?: string;
        /** @description The events this webhook is subscribed to. */
        events?: (
          | "issue:comment_created"
          | "issue:created"
          | "issue:updated"
          | "pipeline:span_created"
          | "project:updated"
          | "pullrequest:approved"
          | "pullrequest:changes_request_created"
          | "pullrequest:changes_request_removed"
          | "pullrequest:comment_created"
          | "pullrequest:comment_deleted"
          | "pullrequest:comment_reopened"
          | "pullrequest:comment_resolved"
          | "pullrequest:comment_updated"
          | "pullrequest:created"
          | "pullrequest:fulfilled"
          | "pullrequest:push"
          | "pullrequest:rejected"
          | "pullrequest:unapproved"
          | "pullrequest:updated"
          | "repo:commit_comment_created"
          | "repo:commit_status_created"
          | "repo:commit_status_updated"
          | "repo:created"
          | "repo:deleted"
          | "repo:fork"
          | "repo:imported"
          | "repo:push"
          | "repo:transfer"
          | "repo:updated"
        )[];
        /** @description The secret to associate with the hook. The secret is never returned via the API. As such, this field is only used during updates. The secret can be set to `null` or "" to remove the secret (or create a hook with no secret). Leaving out the secret field during updates will leave the secret unchanged. Leaving out the secret during creation will create a hook with no secret. */
        secret?: string;
        /** @description Indicates whether or not the hook has an associated secret. It is not possible to see the hook's secret. This field is ignored during updates. */
        secret_set?: boolean;
        subject?: components["schemas"]["object"];
        /**
         * @description The type of entity. Set to either `repository` or `workspace` based on where the subscription is defined.
         * @enum {string}
         */
        subject_type?: "repository" | "workspace";
        /**
         * Format: uri
         * @description The URL events get delivered to.
         */
        url?: string;
        /** @description The webhook's id */
        uuid?: string;
      } & {
        [key: string]: unknown;
      }));
    workspace: {
      type: "workspace";
    } & (Omit<components["schemas"]["object"], "type"> &
      ({
        /** Format: date-time */
        created_on?: string;
        /**
         * @description Controls the rules for forking repositories within this workspace.
         *
         *     * **allow_forks**: unrestricted forking
         *     * **internal_only**: prevents forking of private repositories outside the workspace or to public repositories
         * @enum {string}
         */
        forking_mode?: "allow_forks" | "internal_only";
        /** @description Indicates whether the workspace belongs to an individual user. */
        is_personal?: boolean;
        /** @description Indicates whether the workspace enforces private content, or whether it allows public content. */
        is_privacy_enforced?: boolean;
        /**
         * @description Indicates whether the workspace is publicly accessible, or whether it is
         *     private to the members and consequently only visible to members.
         */
        is_private?: boolean;
        links?: {
          /**
           * Link
           * @description A link to a resource related to this object.
           */
          avatar?: {
            /** Format: uri */
            href?: string;
            name?: string;
          };
          /**
           * Link
           * @description A link to a resource related to this object.
           */
          html?: {
            /** Format: uri */
            href?: string;
            name?: string;
          };
          /**
           * Link
           * @description A link to a resource related to this object.
           */
          members?: {
            /** Format: uri */
            href?: string;
            name?: string;
          };
          /**
           * Link
           * @description A link to a resource related to this object.
           */
          owners?: {
            /** Format: uri */
            href?: string;
            name?: string;
          };
          /**
           * Link
           * @description A link to a resource related to this object.
           */
          projects?: {
            /** Format: uri */
            href?: string;
            name?: string;
          };
          /**
           * Link
           * @description A link to a resource related to this object.
           */
          repositories?: {
            /** Format: uri */
            href?: string;
            name?: string;
          };
          /**
           * Link
           * @description A link to a resource related to this object.
           */
          self?: {
            /** Format: uri */
            href?: string;
            name?: string;
          };
          /**
           * Link
           * @description A link to a resource related to this object.
           */
          snippets?: {
            /** Format: uri */
            href?: string;
            name?: string;
          };
        };
        /** @description The name of the workspace. */
        name?: string;
        /** @description The short label that identifies this workspace. */
        slug?: string;
        /** Format: date-time */
        updated_on?: string;
        /** @description The workspace's immutable id. */
        uuid?: string;
      } & {
        [key: string]: unknown;
      }));
    workspace_access: {
      type: "workspace_access";
    } & (Omit<components["schemas"]["object"], "type"> &
      ({
        /** @description The permission level the user has for the workspace. True if the user is an administrator, otherwise False. */
        administrator?: boolean;
        workspace?: components["schemas"]["workspace_base"];
      } & {
        [key: string]: unknown;
      }));
    workspace_base: {
      type: "workspace_base";
    } & (Omit<components["schemas"]["object"], "type"> &
      ({
        links?: {
          /**
           * Link
           * @description A link to a resource related to this object.
           */
          avatar?: {
            /** Format: uri */
            href?: string;
            name?: string;
          };
          /**
           * Link
           * @description A link to a resource related to this object.
           */
          self?: {
            /** Format: uri */
            href?: string;
            name?: string;
          };
        };
        /** @description The short label that identifies this workspace. */
        slug?: string;
        /** @description The workspace's immutable id. */
        uuid?: string;
      } & {
        [key: string]: unknown;
      }));
    workspace_membership: {
      type: "workspace_membership";
    } & (Omit<components["schemas"]["object"], "type"> &
      ({
        links?: {
          /**
           * Link
           * @description A link to a resource related to this object.
           */
          self?: {
            /** Format: uri */
            href?: string;
            name?: string;
          };
        };
        user?: components["schemas"]["account"];
        workspace?: components["schemas"]["workspace"];
      } & {
        [key: string]: unknown;
      }));
  };
  responses: never;
  parameters: never;
  requestBodies: {
    /** @description The application property to create or update. */
    application_property: {
      content: {
        "application/json": components["schemas"]["application_property"];
      };
    };
    /** @description The permission to grant */
    "bitbucket.apps.permissions.serializers.ProjectPermissionUpdateSchema": {
      content: {
        "application/json": components["schemas"]["bitbucket.apps.permissions.serializers.ProjectPermissionUpdateSchema"];
      };
    };
    /** @description The permission to grant */
    "bitbucket.apps.permissions.serializers.RepoPermissionUpdateSchema": {
      content: {
        "application/json": components["schemas"]["bitbucket.apps.permissions.serializers.RepoPermissionUpdateSchema"];
      };
    };
    /** @description The updated variable. */
    pipeline_variable: {
      content: {
        "application/json": components["schemas"]["pipeline_variable"];
      };
    };
    /** @description The variable to create. */
    pipeline_variable2: {
      content: {
        "application/json": components["schemas"]["pipeline_variable"];
      };
    };
    project: {
      content: {
        "application/json": components["schemas"]["project"];
      };
    };
    /** @description The new snippet object. */
    snippet: {
      content: {
        "application/json": components["schemas"]["snippet"];
      };
    };
  };
  headers: never;
  pathItems: never;
}
export type $defs = Record<string, never>;
export type operations = Record<string, never>;
