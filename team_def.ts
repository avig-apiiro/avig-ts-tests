import * as DbObjectBuilder from "luna/tools/language_def/db_object_builder/builder";
import type { DbObjectConfig } from "luna/tools/language_def/db_object_def/db_object_config";

// Note: this is referenced in LunaServer team.ts
// ##TeamTypeConsistency
// consider updating api_paging_domain_projection_def.ts if you're changing this
// Should be kept in sync with TeamModel.scala.
export const TeamType = {
    Secret: 10 as const,
    RequestToJoin: 20 as const,
    // AllCanJoin: <30>30,
    Public: 40 as const,
    // OneStaffTeam: <30>50
};

export type TeamTypeType = (typeof TeamType)[keyof typeof TeamType];

// For use in the Admin Console, see also:
// - #DivisionAdminConsoleTeam
// - #HiddenTeamsInTheAdminConsole
const def: DbObjectConfig = DbObjectBuilder.build({
    base_classes: [
        "DomainShardedWorldObject",
        "AttachmentTargetable",
        "WorkloadContainerGroupable",
        "TAllocationResource",
        "WorkloadGroupable",
        "PartyLicenseContextObjectGroupable",
        "Party",
        "TCuratedContentParent",
        "TColorCustomizable",
        "TAutomationMembershipTarget",
        "TShareableMember",
        "TCuratedContentTarget",
        "MultiViewable",
    ],
    description: "A group of people (DomainUser) who collaborate on projects with each other",
    options: o => o.shardedness({ type: "RefSharded", field: "team_domain" }),
    properties: {
        // #ModificationTime
        // this was added without a backfill, so this property may not be up to date for all teams
        __modification_time: p =>
            p
                .primitive("Timestamp")
                .classification("EventsAndMetadata")
                .fallbackValue(0)
                // This needs to be blacklisted because the frequent writes to this property causes too many invalidations, overloading LunaDb
                .blacklistedForLunaDbPubsub() // #LunaDbInvalidationBlacklistInDataModel
                .description("Time when user-visible content was last modified on this object.")
                .writeAccessControl(ac =>
                    ac
                        .writeableOnServerWithoutPrincipal()
                        .writeableAtObjectCreation({ INSECURE_extendScopeToCreationHandler: true })
                        .writeableWithPermission("View")
                ),
        creator_du: p =>
            p
                .object("DomainUser")
                .allowNull()
                .writeAccessControl(ac =>
                    ac
                        .writeableOnServerWithoutPrincipal()
                        // A du may not always exist until after a Team has been
                        // created for the user, so we may need to attach this field
                        // after creation.
                        // #ActionScopedAccessControlIsUnsafe
                        .writeableAtObjectCreation({ INSECURE_extendScopeToCreationHandler: true })
                        // #FixmeThisPropertyHasNoPermission
                        .writeableWithPermission("FIXME_THIS_PROPERTY_HAS_NO_PERMISSION")
                )
                .onThisDelete("doNothing"),
        name: p =>
            p
                .primitive("String")
                .classification("BusinessRecords")
                .exportMode("IExportable.ExportConfigs.NORMAL")
                .writeAccessControl(ac =>
                    ac
                        .writeableOnServerWithoutPrincipal()
                        .writeableAtObjectCreation({
                            DISCOURAGED_extendScopeToCreationTransaction: true,
                        })
                        .writeableWithPermission("DISCOURAGED_RUNNING_IN_VERB")
                        .writeableWithPermission("EditName")
                ),
        is_used_for_license_management: p =>
            p
                .primitive("Boolean")
                .classification("Operational")
                .fallbackValue(false)
                .writeAccessControl(ac =>
                    ac
                        .writeableOnServerWithoutPrincipal()
                        .writeableAtObjectCreation()
                        // #FixmeThisPropertyHasNoPermission
                        .writeableWithPermission("FIXME_THIS_PROPERTY_HAS_NO_PERMISSION")
                ),
        administrative_settings: p =>
            p.object("TeamAdministrativeSettings").writeAccessControl(ac =>
                ac
                    .writeableOnServerWithoutPrincipal()
                    .writeableAtObjectCreation({
                        DISCOURAGED_extendScopeToCreationTransaction: true,
                    })
                    // #FixmeThisPropertyHasNoPermission
                    .writeableWithPermission("FIXME_THIS_PROPERTY_HAS_NO_PERMISSION")
            ),
        description: p =>
            p
                .primitive("String")
                .classification("UserWorkContent")
                .exportMode("IExportable.ExportConfigs.NORMAL")
                // NB: null is *not* an acceptable value for this property and will cause clients to
                // crash. Our product code should continue to write "" for this at all times.
                // TODO actually change fallback value: https://app.asana.com/0/685718070186/871007997938937
                .allowNull()
                .fallbackValue(null)
                .writeAccessControl(ac =>
                    ac
                        .writeableOnServerWithoutPrincipal()
                        .writeableAtObjectCreation({ INSECURE_extendScopeToCreationHandler: true })
                        .writeableWithPermission("EditDescription")
                ),
        rich_description: p =>
            p
                .primitive("String")
                .classification("UserWorkContent")
                .exportMode("IExportable.ExportConfigs.NORMAL")
                .allowNull()
                .fallbackValue("")
                .writeAccessControl(ac =>
                    ac
                        .writeableOnServerWithoutPrincipal()
                        .writeableAtObjectCreation({ INSECURE_extendScopeToCreationHandler: true })
                        .writeableWithPermission("EditDescription")
                ),
        // Unique property name to improve query performance #OKVStorePropertyIdsSharedBetweenObjects
        team_domain: p =>
            p
                .object("Domain")
                .trackInitialValue()
                .immutable()
                .writeAccessControl(ac =>
                    ac
                        .writeableOnServerWithoutPrincipal()
                        // #ReviewAccessScopeBeforeWriting
                        .writeableAtObjectCreation()
                        // #ThisPropertyNeedsNoPermission
                        .writeableWithPermission("NO_PERMISSION")
                )
                .onThisDelete("doNothing"),
        domain: p => p.aliasOf("team_domain"),
        team_type: p =>
            p
                .primitive("Integer")
                .classification("EventsAndMetadata")
                .validValues(Object.values(TeamType))
                .trackInitialValue()
                .exportModeAdvanced("IExportable.ExportConfigs.TEAM_TYPE")
                .writeAccessControl(ac =>
                    ac
                        .writeableOnServerWithoutPrincipal()
                        .writeableAtObjectCreation()
                        .writeableWithPermission("EditType")
                ),
        // Temporary property used in the migration to decouple project and team access control.
        is_team_type_change_syncing: p =>
            p
                .primitive("Boolean")
                .classification("EventsAndMetadata")
                .description(
                    "Indicates if the team type change on this team is syncing its changes to all of its projects"
                )
                .fallbackValue(false)
                .trackInitialValue()
                .writeAccessControl(ac =>
                    ac
                        .writeableOnServerWithoutPrincipal()
                        .writeableAtObjectCreation()
                        .writeableWithPermission("EditType")
                )
                .deprecated("ERROR"),

        division: p =>
            p
                .object("Division")
                .allowIndexToSkipFallbackValue()
                .allowNull()
                .trackInitialValue()
                .writeAccessControl(ac =>
                    ac
                        .writeableOnServerWithoutPrincipal()
                        .writeableAtObjectCreation({
                            DISCOURAGED_extendScopeToCreationTransaction: true,
                        })
                        .writeableWithPermission("DISCOURAGED_RUNNING_IN_VERB")
                )
                .onThisDelete("doNothing"),

        // category is a cosmetic label, useful for us for tracking usage of
        // asana, and was used in a defunct experiment "nux_team_categories"
        category: p =>
            p
                .primitive("String")
                .classification("UserWorkContent")
                .allowNull()
                .fallbackValue(null)
                .writeAccessControl(ac =>
                    ac
                        .writeableOnServerWithoutPrincipal()
                        // #FixmeThisPropertyHasNoPermission
                        .writeableWithPermission("FIXME_THIS_PROPERTY_HAS_NO_PERMISSION")
                ),

        // Determines whether they notify all members or not.
        // If false, only people designated as receivers with TeamMembership are notified.
        force_join_request_notifications_for_all_members: p =>
            p
                .primitive("Boolean")
                .classification("EventsAndMetadata")
                .fallbackValue(true)
                .writeAccessControl(ac =>
                    ac
                        .writeableOnServerWithoutPrincipal()
                        .writeableAtObjectCreation({
                            DISCOURAGED_extendScopeToCreationTransaction: true,
                        })
                        .writeableWithPermission("EditTeamDeprecated")
                ),

        /**
         * @deprecated The billing_owner should be read from the billing_info instead
         */
        billing_owner: p =>
            p
                .object("DomainUser") // in recurly this is stored as User id!
                .allowNull()
                .fallbackValue(null)
                .deprecated("WARN")
                .trackInitialValue()
                .writeAccessControl(ac =>
                    ac
                        .writeableOnServerWithoutPrincipal()
                        // #FixmeThisPropertyHasNoPermission
                        .writeableWithPermission("FIXME_THIS_PROPERTY_HAS_NO_PERMISSION")
                )
                .lunaServerCodegenOptions({
                    getters: "RawOnly",
                })
                .onThisDelete("doNothing"),
        /**
         * @deprecated premium_plan_name deprecated for product_catalog_plans
         */
        premium_plan_name: p =>
            p
                .primitive("String")
                .classification("BusinessRecords")
                .allowNull()
                .fallbackValue(null)
                .writeAccessControl(ac =>
                    ac
                        .writeableOnServerWithoutPrincipal()
                        // #FixmeThisPropertyHasNoPermission
                        .writeableWithPermission("FIXME_THIS_PROPERTY_HAS_NO_PERMISSION")
                )
                .deprecated("WARN"),
        /**
         * @deprecated previous_premium_plan_name deprecated for previous_product_catalog_plans
         */
        previous_premium_plan_name: p =>
            p
                .primitive("String")
                .classification("BusinessRecords")
                .allowNull()
                .fallbackValue(null)
                .writeAccessControl(ac =>
                    ac
                        .writeableOnServerWithoutPrincipal()
                        // #FixmeThisPropertyHasNoPermission
                        .writeableWithPermission("FIXME_THIS_PROPERTY_HAS_NO_PERMISSION")
                )
                .deprecated("WARN"),
        /**
         * @deprecated The payment_card_type should be read from the billing_info instead
         */
        payment_card_type: p =>
            p
                .primitive("String")
                .classification("BusinessRecords")
                .serverOnly()
                .allowNull()
                .fallbackValue(null)
                .writeAccessControl(ac =>
                    ac
                        .writeableOnServerWithoutPrincipal()
                        // #FixmeThisPropertyHasNoPermission
                        .writeableWithPermission("FIXME_THIS_PROPERTY_HAS_NO_PERMISSION")
                )
                .deprecated("WARN"),
        /**
         * @deprecated The payment_card_last_digits should be read from the billing_info instead
         */
        payment_card_last_digits: p =>
            p
                .primitive("String")
                .classification("BusinessRecords")
                .serverOnly()
                .allowNull()
                .fallbackValue(null)
                .writeAccessControl(ac =>
                    ac
                        .writeableOnServerWithoutPrincipal()
                        // #FixmeThisPropertyHasNoPermission
                        .writeableWithPermission("FIXME_THIS_PROPERTY_HAS_NO_PERMISSION")
                )
                .deprecated("WARN"),
        /**
         * @deprecated The free_to_premium_upgrade_time should be read from the billing_info instead
         */
        free_to_premium_upgrade_time: p =>
            p
                .primitive("Integer")
                .classification("EventsAndMetadata")
                .allowNull()
                .fallbackValue(null)
                .writeAccessControl(ac =>
                    ac
                        .writeableOnServerWithoutPrincipal()
                        // #FixmeThisPropertyHasNoPermission
                        .writeableWithPermission("FIXME_THIS_PROPERTY_HAS_NO_PERMISSION")
                )
                .deprecated("WARN"),

        // All teams are assumed to have a non-null billing info, created during
        // teams creation. #AssumeBillableGroupsHaveNonNullBillingInfo
        billing_info: p =>
            p
                .object("BillingInfo")
                .allowNull()
                .fallbackValue(null)
                .allowIndexToSkipFallbackValue()
                .writeAccessControl(
                    ac =>
                        ac
                            .writeableOnServerWithoutPrincipal()
                            // #FixmeThisPropertyHasNoPermission
                            .writeableWithPermission("FIXME_THIS_PROPERTY_HAS_NO_PERMISSION")
                    // Multiple Permissions issue for writeableWithPermission
                    // TODO: https://app.asana.com/0/1139149782646273/1139149782646280
                ),

        /**
         * @deprecated The last_changed_premium_status should be read from the billing_info instead
         */
        last_changed_premium_status: p =>
            p
                .primitive("Integer")
                .classification("EventsAndMetadata")
                .allowNull()
                .fallbackValue(null)
                .deprecated("WARN")
                .writeAccessControl(ac =>
                    ac
                        .writeableOnServerWithoutPrincipal()
                        // #FixmeThisPropertyHasNoPermission
                        .writeableWithPermission("FIXME_THIS_PROPERTY_HAS_NO_PERMISSION")
                ),
        // Deprecated, in favor of group_is_full_alert_email_sent_times_json on
        // domain user secondary properties.
        // largest_plan_size_warning_sent: p => p.primitive("Integer").classification("EventsAndMetadata").fallbackValue(0),

        /**
         * Team member limit if this is a free team in a free domain.  We will
         * grandfather old teams in at 30, but new teams will be created with 15.
         */
        // TODO##TeamsMemberLimit consider backfilling all old teams with 30 and
        // changing default to 15 and making this read-only.
        //
        // NOTE: This property is immutable in prod but is modified in tests.
        free_member_limit: p =>
            p
                .primitive("Integer")
                .classification("EventsAndMetadata")
                .fallbackValue(30)
                .writeAccessControl(ac =>
                    ac
                        .writeableOnServerWithoutPrincipal()
                        .writeableAtObjectCreation({
                            DISCOURAGED_extendScopeToCreationTransaction: true,
                        })
                        // #FixmeThisPropertyHasNoPermission
                        .writeableWithPermission("FIXME_THIS_PROPERTY_HAS_NO_PERMISSION")
                ),

        show_harvest_integration: p =>
            p
                .primitive("Boolean")
                .classification("EventsAndMetadata")
                .fallbackValue(false)
                .writeAccessControl(ac =>
                    ac
                        .writeableOnServerWithoutPrincipal()
                        .writeableAtObjectCreation({
                            DISCOURAGED_extendScopeToCreationTransaction: true,
                        })
                        .writeableWithPermission("ModifyIntegrations")
                ),

        // @deprecated - a hack that we've removed.
        ticker_story: p =>
            p
                .object("Story")
                .allowNull()
                .blacklistedForLunaDbPubsub() // #LunaDbInvalidationBlacklistInDataModel
                .fallbackValue(null)
                .writeAccessControl(ac =>
                    ac
                        .writeableOnServerWithoutPrincipal()
                        // #FixmeThisPropertyHasNoPermission
                        .writeableWithPermission("FIXME_THIS_PROPERTY_HAS_NO_PERMISSION")
                )
                .deprecated("WARN")
                .onRefDelete("setNull"),

        // Needed for IHasImage
        // TODO#GroupMessaging: if we decide to let people set the team photo,
        // change the AC here.
        profile_image_version: p =>
            p
                .primitive("String")
                .classification("Operational")
                .allowNull()
                .fallbackValue(null)
                .writeAccessControl(ac =>
                    ac
                        .writeableOnServerWithoutPrincipal()
                        // #FixmeThisPropertyHasNoPermission
                        .writeableWithPermission("FIXME_THIS_PROPERTY_HAS_NO_PERMISSION")
                ),

        // denormalization, mostly needed because LunaDb doesn't yet support count queries
        // more info: https://app.asana.com/0/685718070186/224358682959569
        // TODO not backfilled yet: https://app.asana.com/0/188392461747503/224351741459579
        show_calendar_link: p =>
            p
                .primitive("Boolean")
                .classification("EventsAndMetadata")
                .fallbackValue(true)
                .writeAccessControl(ac =>
                    ac
                        .writeableOnServerWithoutPrincipal()
                        // #FixmeThisPropertyHasNoPermission
                        .writeableWithPermission("FIXME_THIS_PROPERTY_HAS_NO_PERMISSION")
                ),
    },

    indexes: [
        i =>
            i
                .simple({
                    name: "ByCreatorDu",
                    indexedFields: ["creator_du", "__trashed_at"],
                })
                .blacklistedForLunaDbPubsub(),
        i =>
            i.reference({
                property: "team_domain",
                joinableFields: ["name", "__trashed_at"],
            }),

        i =>
            i.reference({
                property: "division",
                joinableFields: ["name", "__trashed_at"],
            }),

        i =>
            i.containedInList({
                name: "Conversation:team_followers",
                containingObject: "Conversation",
                listProperty: "team_followers",
                joinableFields: ["__trashed_at", "$element"],
            }),

        i =>
            i.simple({
                name: "ByDomainAndCreationTime",
                indexedFields: ["team_domain", "__trashed_at", "__creation_time"],
                joinableFields: ["team_type"],
            }),

        i =>
            i.simple({
                name: "ByDomainAndName",
                indexedFields: ["team_domain", "__trashed_at", "name"],
                joinableFields: ["team_type"],
            }),

        i =>
            i
                .simple({
                    name: "ByBillingInfo",
                    indexedFields: ["billing_info", "__trashed_at"],
                })
                .dangerouslyAllowPropertyWithFallbackValue(
                    "billing_info",
                    "[DO NOT COPY] this property was grandfathered in from the previous IndexCompiler.scala whitelist"
                ),

        i =>
            i.containedInList({
                name: "CustomDomainOnboardingFlow:teams_restriction",
                containingObject: "CustomDomainOnboardingFlow",
                listProperty: "teams_restriction",
                joinableFields: ["__trashed_at"],
            }),

        i =>
            i.containedInList({
                name: "DomainInsights:most_active_teams",
                containingObject: "DomainInsights",
                joinableFields: ["__trashed_at"],
                listProperty: "most_active_teams",
            }),
        i =>
            i.containedInList({
                name: "PublicDomainInsights:most_active_teams",
                containingObject: "PublicDomainInsights",
                joinableFields: ["__trashed_at"],
                listProperty: "most_active_teams",
            }),
        i =>
            i.containedInList({
                name: "DivisionInsights:most_active_teams",
                containingObject: "DivisionInsights",
                joinableFields: ["__trashed_at"],
                listProperty: "most_active_teams",
            }),

        // ##DeprecateTeamsForFilter https://app.asana.com/0/685718070186/1200651166444335/f
        // i =>
        //     i.containedInList({
        //         name: "DomainUserGoalsViewSettings:teams_for_filter",
        //         containingObject: "DomainUserGoalsViewSettings",
        //         joinableFields: ["__trashed_at"],
        //         listProperty: "teams_for_filter",
        //     }),
    ],

    /*
     * ##TreatTrashedTeamsAsAccessDenied - the access denied rules do not disallow users from
     * accessing trashed teams but likely should. The work to add this is tracked here:
     * https://app.asana.com/0/261095544/1200391265201739/f
     *
     * Look for this tag for other places this comes up. Note that these are not *all* the places -- this tag was added
     * after this rule has existed for a while.
     *
     * This is similar to #TreatTrashedPotsAsAccessDenied.
     */
    accessControl: ac => {
        // This is actually pretty janky. Despite the fact that expression
        // definition is shared, every invocation of this function (which we
        // have two) creates a separate expression tree with separate queries.
        // This is quite unfortunate, but the queries should be relatively light,
        // so this should be ok.
        // A proper way of fixing this would be by introducing multi-parameter
        // functions with arbitrary return values into the language, which is
        // some non-trivial amount of work.
        const teamMembershipTest = (predicate: string) => {
            return ac.letvar(
                "domain_user",
                ac.firstMatchOrNull(
                    ac.query("DomainUser.domain_user_is_unique", qf =>
                        qf.isCurrentActorId("user").eq("domain", ac.property("team_domain"))
                    )
                ),
                ac.and(
                    ac.ne(ac.constant(null), ac.local("domain_user")),
                    ac.exists(
                        predicate,
                        ac.query("TeamMembership.team_membership_is_unique", qf =>
                            qf.eq("team", ac.arg()).eq("member", ac.local("domain_user"))
                        )
                    )
                )
            );
        };

        const automation_membership_query = ac.query(
            "AutomationMembership.ByAutomationStepAndMembershipTarget",
            qf =>
                qf
                    .eq("membership_target", ac.arg())
                    .eq(
                        "automation_step",
                        ac.objectProperty(ac.actorOrNull("AutomationRecord"), "automation_step")
                    )
        );

        ac.define({
            visible: ac.and(
                ac.test("Domain.visible", ac.property("team_domain")),
                ac.or(
                    ac.test("visible_to_user_actor", ac.arg()),
                    ac.test("visible_to_automation_actor", ac.arg())
                )
            ),
            visible_to_user_actor: ac.and(
                ac.isActorType("User"),
                ac.or(
                    ac.test("visible_in_product", ac.arg()),
                    ac.test("Domain.user_is_super_admin", ac.property("team_domain"))
                )
            ),
            /**
             * #SuperAdminTeamVisibility
             *
             * Super Admin DomainUsers can see teams in their domain even if the team is
             * TeamType.SECRET and they are not a member. We define an intermediate
             * predicate (`visible_in_product`) here, so we can both use it in
             * our `visible` check, as well as compute it directly from the product.
             */
            visible_in_product: ac.or(
                ac.test("member", ac.arg()),
                // Org Members can see non-secret teams
                ac.and(
                    ac.ne(ac.property("team_type"), ac.constant(TeamType.Secret)),
                    ac.test("Domain.user_has_full_access", ac.property("team_domain"))
                ),
                // #ServiceAccounts
                // User is a service account in this domain. The user needs to
                // be able to see all teams (including teams they're not a member of)
                // via the API, so we add the predicate to 'visible_in_product',
                // because this will allow the team to show up in typeaheads/lists,
                // where we'd like to filter out similarly visible teams from admins.
                ac.test("Domain.user_is_service_account", ac.property("team_domain"))
            ),
            member: teamMembershipTest("TeamMembership.active_and_owned"),
            direct_full_access: teamMembershipTest("TeamMembership.full_access"),
            user_has_full_access: ac.and(
                ac.test("not_trashed", ac.arg()),
                ac.or(
                    // Direct access
                    ac.test("direct_full_access", ac.arg()),
                    // Inherit access
                    ac.and(
                        ac.eq(ac.property("team_type"), ac.constant(TeamType.Public)),
                        ac.test("Domain.visible", ac.property("team_domain")),
                        ac.test("Domain.user_has_full_access", ac.property("team_domain"))
                    )
                )
            ),
            // #KnowledgeBaseVisibility
            // TODO: Fine-grained visibility based on membership https://app.asana.com/0/1207329582783316/1207815943395137
            user_has_knowledge_access: ac.or(
                ac.test("user_has_full_access", ac.arg()),
                ac.test("visible_to_automation_actor", ac.arg())
            ),
            public_team: ac.eq(ac.property("team_type"), ac.constant(TeamType.Public)),
            visible_to_automation_actor: ac.and(
                ac.isActorType("AutomationRecord"),
                // TODO: Remove the ac.or and domain check once the `Pot.ProjectTemplatesByTeam` index is backfilled
                // https://app.asana.com/0/1200002958758078/1200601119738305/f
                ac.or(
                    ac.eq(
                        ac.property("team_domain"),
                        ac.objectProperty(ac.actorOrNull("AutomationRecord"), "domain")
                    ),
                    ac.exists(
                        "Pot.visible_to_automation_actor",
                        ac.query("Pot.ProjectTemplatesByTeam", qf => qf.eq("team", ac.arg()))
                    ),
                    ac.test("automation_actor_is_member_of_team", ac.arg())
                )
            ),
            active: ac.test("not_trashed", ac.arg()),
            active_and_not_trashed: ac.and(
                ac.test("active", ac.arg()),
                ac.test("not_trashed", ac.arg())
            ),
            user_is_full_member_of_party: ac.test("direct_full_access", ac.arg()),
            user_is_member_of_party: ac.test("member", ac.arg()),
            automation_actor_is_member_of_team: ac.and(
                ac.isActorType("AutomationRecord"),

                // AutomationRecord should be able to see a Team, provided that the relevant Rule has a
                // membership join object to that Team
                ac.exists("AutomationMembership.exists", automation_membership_query)
            ),
        });
    },
});

export { def as default };
