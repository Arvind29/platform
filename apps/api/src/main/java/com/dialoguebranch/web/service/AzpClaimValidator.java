/*
 *
 *                 Copyright (c) 2023-2026 Dialogue Branch (www.dialoguebranch.com)
 *
 *
 *     This material is part of the Dialogue Branch Platform, and is covered by the MIT License
 *                                        as outlined below.
 *
 *                                            ----------
 *
 * Copyright (c) 2023-2026 Dialogue Branch (www.dialoguebranch.com)
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
 * associated documentation files (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge, publish, distribute,
 * sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or
 * substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT
 * NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
 * DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

package com.dialoguebranch.web.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.Collection;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * {@link OAuth2TokenValidator} that checks a Keycloak access token's {@code azp} ("authorized
 * party") claim against an explicit allow-list of trusted client IDs.
 *
 * <p>Signature, issuer and expiry validation only establish that a token was minted by a trusted
 * Keycloak realm; they say nothing about <em>which client</em> in that realm requested it. In a
 * shared-SSO deployment where several backend services live under one realm, this validator makes
 * "which clients' tokens this service accepts" an explicit, reviewable list in this service's own
 * configuration ({@code dlb.auth.keycloak.trusted-clients}), rather than an emergent property of
 * whatever clients happen to be registered in the realm.</p>
 *
 * <p>A single {@code "*"} entry in the allow-list disables the check entirely: any token from an
 * otherwise-trusted realm is accepted, restoring the behaviour from before this validator existed.
 * A token with no {@code azp} claim is always rejected (Keycloak always populates it on access
 * tokens, so its absence is anomalous).</p>
 *
 * <p>Rejections surface as a normal {@code 401} (error code {@code invalid_token}), the same as
 * every other authentication failure. To help a self-hoster notice a misconfiguration rather than
 * chase a mystery {@code 401}, the first rejection of each distinct {@code azp} value is also
 * logged at {@code WARN}. That de-duplication set is capped at {@link #WARN_CACHE_CAP} entries so a
 * flood of tokens carrying random {@code azp} values cannot grow it without bound; past the cap,
 * further first-time rejections are logged at {@code DEBUG} only.</p>
 *
 * @author Harm op den Akker
 */
final class AzpClaimValidator implements OAuth2TokenValidator<Jwt> {

    /** Upper bound on the number of distinct rejected {@code azp} values remembered for WARN de-duplication. */
    static final int WARN_CACHE_CAP = 100;

    private static final Logger logger = LoggerFactory.getLogger(AzpClaimValidator.class);

    private final Set<String> trustedClients;
    private final boolean trustAnyClient;
    private final Set<String> warnedAzpValues = ConcurrentHashMap.newKeySet();

    /**
     * Creates a validator that accepts tokens whose {@code azp} claim is one of
     * {@code trustedClients}. If {@code trustedClients} contains {@code "*"}, every token is
     * accepted regardless of its {@code azp}.
     *
     * @param trustedClients the trusted client IDs; must be non-empty (callers pass
     *                       {@code DlbProperties.Auth.Keycloak#getEffectiveTrustedClients()},
     *                       which never returns an empty list).
     */
    AzpClaimValidator(Collection<String> trustedClients) {
        this.trustedClients = Set.copyOf(trustedClients);
        this.trustAnyClient = this.trustedClients.contains("*");
    }

    @Override
    public OAuth2TokenValidatorResult validate(Jwt token) {
        if (trustAnyClient) {
            return OAuth2TokenValidatorResult.success();
        }
        String azp = token.getClaimAsString("azp");
        if (azp != null && trustedClients.contains(azp)) {
            return OAuth2TokenValidatorResult.success();
        }
        warnFirstTime(azp);
        return OAuth2TokenValidatorResult.failure(new OAuth2Error(
                "invalid_token",
                "The token's azp claim '" + azp + "' is not a trusted client",
                null));
    }

    /**
     * Logs the first rejection of each distinct {@code azp} value at {@code WARN} (or {@code DEBUG}
     * once {@link #WARN_CACHE_CAP} distinct values have been seen), and stays silent for repeats.
     */
    private void warnFirstTime(String azp) {
        String key = azp == null ? "<missing>" : azp;
        if (warnedAzpValues.contains(key)) {
            return;
        }
        if (warnedAzpValues.size() < WARN_CACHE_CAP && warnedAzpValues.add(key)) {
            logger.warn("Rejected a validly-signed token from an untrusted client (azp='{}'). "
                    + "Add it to dlb.auth.keycloak.trusted-clients if this client is meant to "
                    + "call this service.", key);
        } else {
            logger.debug("Rejected a validly-signed token from an untrusted client (azp='{}').", key);
        }
    }
}
