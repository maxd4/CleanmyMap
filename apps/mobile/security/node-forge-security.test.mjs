import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import test from "node:test";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const mobileRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const vendorRoot = path.join(mobileRoot, "vendor/node-forge");

const upstreamValidation = `          if(!asn1.validate(obj, digestInfoValidator, capture, errors) ||
            obj.value.length !== 2) {`;
const backportValidation = `          if(!asn1.validate(obj, digestInfoValidator, capture, errors) ||
            obj.value.length !== 2 ||
            obj.value[0].value.length !==
              (('parameters' in capture) ? 2 : 1)) {`;

const modulusHex = [
  "E932AC92252F585B3A80A4DD76A897C8B7652952FE788F6EC8DD640587A1EE56",
  "47670A8AD4C2BE0F9FA6E49C605ADF77B5174230AF7BD50E5D6D6D6D28CCF0A8",
  "86A514CC72E51D209CC772A52EF419F6A953F3135929588EBE9B351FCA61CED7",
  "8F346FE00DBB6306E5C2A4C6DFC3779AF85AB417371CF34D8387B9B30AE46D7A",
  "5FF5A655B8D8455F1B94AE736989D60A6F2FD5CADBFFBD504C5A756A2E6BB5CE",
  "CC13BCA7503F6DF8B52ACE5C410997E98809DB4DC30D943DE4E812A47553DCE5",
  "4844A78E36401D13F77DC650619FED88D8B3926E3D8E319C80C744779AC5D6AB",
  "E252896950917476ECE5E8FC27D5F053D6018D91B502C4787558A002B9283DA7",
].join("");

const forgedSignatureHex = [
  "a4ae63dd5e7712b78f4870d0f51e294df5503d4f16c5d27ae33370981fb57f0de49f",
  "50f3d6a04666774cd984cd13972db9bf8e12bd294ef0ddc916c7c86cbae63efd7b6b",
  "97885e69760c208a40f1aecc76a90d7af5145177efce1bb55807a8d05c20b1596753",
  "ba710642fc9acdde6c160232654662c77cc4466c8257a38edb49f894e8845d0fd987",
  "b857ced88f4b62505a080bd87ef700d35d392a6e8f6fde34250c50b86fae606cb551",
  "215e8f4813239b77651d5565ad453698c071d48c31e8e526fb4a37610f64b3e1fb8e",
  "5be5898e408ad08197a0947794a530b54f84485377ce4a7488ed485ce4e5e105dd89",
  "698a472f390c3b1b76bc16b73276c4d1c81d",
].join("");

function verifyForgedDigest(forge) {
  const publicKey = forge.pki.rsa.setPublicKey(
    new forge.jsbn.BigInteger(modulusHex, 16),
    new forge.jsbn.BigInteger("3", 10),
  );
  const digest = forge.md.sha256.create();
  digest.update("hello world!");
  return publicKey.verify(
    digest.digest().getBytes(),
    forge.util.hexToBytes(forgedSignatureHex),
    undefined,
    { _parseAllDigestBytes: false, _skipPaddingChecks: true },
  );
}

test("rejects the nested DigestAlgorithm RSA forgery from forge#1152", () => {
  const localForge = require(vendorRoot);
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cleanmymap-forge-reference-"));
  const referenceRoot = path.join(temporaryRoot, "node-forge");

  try {
    fs.cpSync(vendorRoot, referenceRoot, { recursive: true });
    const rsaPath = path.join(referenceRoot, "lib/rsa.js");
    const patchedSource = fs.readFileSync(rsaPath, "utf8");
    assert.equal(patchedSource.split(backportValidation).length - 1, 1);
    fs.writeFileSync(rsaPath, patchedSource.replace(backportValidation, upstreamValidation));

    const upstreamForge140Reference = require(referenceRoot);
    assert.equal(
      verifyForgedDigest(upstreamForge140Reference),
      true,
      "the exact node-forge@1.4.0 validation must reproduce the accepted forgery",
    );
    assert.throws(
      () => verifyForgedDigest(localForge),
      /ASN\.1 object does not contain a valid RSASSA-PKCS1-v1_5 DigestInfo value\./,
    );
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test("resolves both Expo consumers to the local backport", () => {
  const consumerPackages = [
    require.resolve("@expo/cli/package.json", { paths: [mobileRoot] }),
    require.resolve("@expo/code-signing-certificates/package.json", { paths: [mobileRoot] }),
  ];
  for (const consumerPackage of consumerPackages) {
    assert.equal(
      require.resolve("node-forge/package.json", { paths: [path.dirname(consumerPackage)] }),
      path.join(vendorRoot, "package.json"),
    );
  }
});

test("smokes the node-forge functions consumed by Expo code signing", () => {
  const codeSigning = require("@expo/code-signing-certificates");
  const keyPair = codeSigning.generateKeyPair();
  const pemPair = codeSigning.convertKeyPairToPEM(keyPair);
  const restoredKeyPair = codeSigning.convertKeyPairPEMToKeyPair(pemPair);
  const now = Date.now();
  const certificate = codeSigning.generateSelfSignedCodeSigningCertificate({
    keyPair: restoredKeyPair,
    validityNotBefore: new Date(now - 60_000),
    validityNotAfter: new Date(now + 86_400_000),
    commonName: "CleanMyMap Expo security smoke test",
  });

  codeSigning.validateSelfSignedCertificate(certificate, restoredKeyPair);
  assert.match(
    codeSigning.signBufferRSASHA256AndVerify(
      restoredKeyPair.privateKey,
      certificate,
      Buffer.from("CleanMyMap Expo tooling smoke test"),
    ),
    /^[A-Za-z0-9+/]+=*$/,
  );
});

test("rejects malformed PEM markers without regex backtracking", { timeout: 1000 }, () => {
  const localForge = require(vendorRoot);
  const malformed = [
    "-----BEGIN CERTIFICATE-----",
    `${" ".repeat(20_000)}!`,
    "-----END CERTIFICATE-----",
  ].join("\n");

  assert.throws(() => localForge.pem.decode(malformed), /Invalid PEM formatted message/);
});

test("restricts node-forge worker messages to the current origin", () => {
  for (const relativePath of ["lib/prng.js", "lib/util.js"]) {
    const source = fs.readFileSync(path.join(vendorRoot, relativePath), "utf8");
    assert.match(source, /e\.origin && e\.origin !== self\.location\.origin/);
  }
});
