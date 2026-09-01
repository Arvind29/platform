package com.dialoguebranch.web.service;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Tests {@link DlbProperties.Auth.Keycloak#getEffectiveTrustedClients()}, the resolved {@code azp}
 * allow-list enforced by {@link AzpClaimValidator}.
 */
class DlbPropertiesTest {

    @Test
    void effectiveTrustedClientsDefaultsToTheConfiguredClientIdWhenUnset() {
        DlbProperties.Auth.Keycloak kc = new DlbProperties.Auth.Keycloak();
        kc.setClientId("dlb-web-service");
        assertEquals(List.of("dlb-web-service"), kc.getEffectiveTrustedClients());
    }

    @Test
    void effectiveTrustedClientsFollowsACustomClientIdWhenUnset() {
        DlbProperties.Auth.Keycloak kc = new DlbProperties.Auth.Keycloak();
        kc.setClientId("my-renamed-client");
        assertEquals(List.of("my-renamed-client"), kc.getEffectiveTrustedClients());
    }

    @Test
    void effectiveTrustedClientsUsesTheExplicitListWhenSet() {
        DlbProperties.Auth.Keycloak kc = new DlbProperties.Auth.Keycloak();
        kc.setClientId("dlb-web-service");
        kc.setTrustedClients(List.of("dlb-web-service", "sibling-a", "sibling-b"));
        assertEquals(List.of("dlb-web-service", "sibling-a", "sibling-b"),
                kc.getEffectiveTrustedClients());
    }

    @Test
    void effectiveTrustedClientsPassesTheWildcardEntryThrough() {
        DlbProperties.Auth.Keycloak kc = new DlbProperties.Auth.Keycloak();
        kc.setTrustedClients(List.of("*"));
        assertEquals(List.of("*"), kc.getEffectiveTrustedClients());
    }
}
