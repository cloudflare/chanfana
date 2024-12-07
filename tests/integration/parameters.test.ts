import { describe, expect, it } from "vitest";
import { ToDoList, todoRouter } from "../router";
import { buildRequest, findError } from "../utils";

describe("queryParametersValidation", () => {
  it("requiredFields", async () => {
    const request = await todoRouter.fetch(buildRequest({ method: "GET", path: "/todos" }));
    const resp = await request.json();

    // minus 1, because 1 parameter is optional
    expect(resp.errors.length).toEqual(
      // @ts-ignore
      Object.keys(new ToDoList({}).schema.request.query.shape).length - 1,
    );

    // sanity check some parameters
    expect(findError(resp.errors, "p_number")).toEqual("Required");
    expect(findError(resp.errors, "p_boolean")).toEqual("Required");
  });

  it("checkNumberInvalid", async () => {
    const qs = "?p_number=asd";
    const request = await todoRouter.fetch(buildRequest({ method: "GET", path: `/todos${qs}` }));
    const resp = await request.json();

    expect(findError(resp.errors, "p_number")).toEqual("Expected number, received nan");
  });

  it("checkNumberValidFloat", async () => {
    const qs = "?p_number=12.3";
    const request = await todoRouter.fetch(buildRequest({ method: "GET", path: `/todos${qs}` }));
    const resp = await request.json();

    expect(findError(resp.errors, "p_number")).toBeUndefined();
  });

  it("checkNumberValidInteger", async () => {
    const qs = "?p_number=12";
    const request = await todoRouter.fetch(buildRequest({ method: "GET", path: `/todos${qs}` }));
    const resp = await request.json();

    expect(findError(resp.errors, "p_number")).toBeUndefined();
  });

  it("checkStringValid", async () => {
    const qs = "?p_string=asd21_sa";
    const request = await todoRouter.fetch(buildRequest({ method: "GET", path: `/todos${qs}` }));
    const resp = await request.json();

    expect(findError(resp.errors, "p_string")).toBeUndefined();
  });

  it("checkStringInvalidEmpty", async () => {
    const qs = "?p_string=";
    const request = await todoRouter.fetch(buildRequest({ method: "GET", path: `/todos${qs}` }));
    const resp = await request.json();

    expect(findError(resp.errors, "p_string")).toEqual("Expected string, received null");
  });

  it("checkBooleanInvalid", async () => {
    const qs = "?p_boolean=asd";
    const request = await todoRouter.fetch(buildRequest({ method: "GET", path: `/todos${qs}` }));
    const resp = await request.json();

    expect(findError(resp.errors, "p_boolean")).toEqual("Expected boolean, received string");
  });

  it("checkBooleanValid", async () => {
    const qs = "?p_boolean=false";
    const request = await todoRouter.fetch(buildRequest({ method: "GET", path: `/todos${qs}` }));
    const resp = await request.json();

    expect(findError(resp.errors, "p_boolean")).toBeUndefined();
  });

  it("checkBooleanValidCaseInsensitive", async () => {
    const qs = "?p_boolean=TrUe";
    const request = await todoRouter.fetch(buildRequest({ method: "GET", path: `/todos${qs}` }));
    const resp = await request.json();

    expect(findError(resp.errors, "p_boolean")).toBeUndefined();
  });

  it("checkEnumerationSensitiveInvalid", async () => {
    const qs = "?p_enumeration=sfDase";
    const request = await todoRouter.fetch(buildRequest({ method: "GET", path: `/todos${qs}` }));
    const resp = await request.json();

    expect(findError(resp.errors, "p_enumeration")).toEqual(
      "Invalid enum value. Expected 'json' | 'csv', received 'sfDase'",
    );
  });

  it("checkEnumerationSensitiveInvalidCase", async () => {
    const qs = "?p_enumeration=Csv";
    const request = await todoRouter.fetch(buildRequest({ method: "GET", path: `/todos${qs}` }));
    const resp = await request.json();

    expect(findError(resp.errors, "p_enumeration")).toEqual(
      "Invalid enum value. Expected 'json' | 'csv', received 'Csv'",
    );
  });

  it("checkEnumerationSensitiveValid", async () => {
    const qs = "?p_enumeration=csv";
    const request = await todoRouter.fetch(buildRequest({ method: "GET", path: `/todos${qs}` }));
    const resp = await request.json();

    expect(findError(resp.errors, "p_enumeration")).toBeUndefined();
  });

  it("checkEnumerationInsensitiveInvalid", async () => {
    const qs = "?p_enumeration_insensitive=sfDase";
    const request = await todoRouter.fetch(buildRequest({ method: "GET", path: `/todos${qs}` }));
    const resp = await request.json();

    expect(findError(resp.errors, "p_enumeration_insensitive")).toEqual(
      "Invalid enum value. Expected 'json' | 'csv', received 'sfdase'",
    );
  });

  it("checkEnumerationInsensitiveValidCase", async () => {
    const qs = "?p_enumeration_insensitive=Csv";
    const request = await todoRouter.fetch(buildRequest({ method: "GET", path: `/todos${qs}` }));
    const resp = await request.json();

    expect(findError(resp.errors, "p_enumeration_insensitive")).toBeUndefined();
  });

  it("checkEnumerationInsensitiveValid", async () => {
    const qs = "?p_enumeration_insensitive=csv";
    const request = await todoRouter.fetch(buildRequest({ method: "GET", path: `/todos${qs}` }));
    const resp = await request.json();

    expect(findError(resp.errors, "p_enumeration_insensitive")).toBeUndefined();
  });

  it("checkDatetimeInvalid", async () => {
    const qs = "?p_datetime=2023-13-01";
    const request = await todoRouter.fetch(buildRequest({ method: "GET", path: `/todos${qs}` }));
    const resp = await request.json();

    expect(findError(resp.errors, "p_datetime")).toEqual("Must be in the following format: YYYY-mm-ddTHH:MM:ssZ");
  });

  it("checkDatetimeInvalid2", async () => {
    const qs = "?p_datetime=sdfg";
    const request = await todoRouter.fetch(buildRequest({ method: "GET", path: `/todos${qs}` }));
    const resp = await request.json();

    expect(findError(resp.errors, "p_datetime")).toEqual("Must be in the following format: YYYY-mm-ddTHH:MM:ssZ");
  });

  it("checkDatetimeInvalid3", async () => {
    const qs = "?p_datetime=2022-09-15T00:00:00+01Z";
    const request = await todoRouter.fetch(buildRequest({ method: "GET", path: `/todos${qs}` }));
    const resp = await request.json();

    expect(findError(resp.errors, "p_datetime")).toEqual("Must be in the following format: YYYY-mm-ddTHH:MM:ssZ");
  });

  it("checkDatetimeValid", async () => {
    const qs = "?p_datetime=2022-09-15T00:00:01Z";
    const request = await todoRouter.fetch(buildRequest({ method: "GET", path: `/todos${qs}` }));
    const resp = await request.json();

    expect(findError(resp.errors, "p_datetime")).toBeUndefined();
  });

  it("checkDatetimeValid2", async () => {
    const qs = "?p_datetime=2022-09-15T00:00:00Z";
    const request = await todoRouter.fetch(buildRequest({ method: "GET", path: `/todos${qs}` }));
    const resp = await request.json();

    expect(findError(resp.errors, "p_datetime")).toBeUndefined();
  });

  it("checkDateInvalid", async () => {
    const qs = "?p_dateonly=2022-13-15";
    const request = await todoRouter.fetch(buildRequest({ method: "GET", path: `/todos${qs}` }));
    const resp = await request.json();

    expect(findError(resp.errors, "p_dateonly")).toEqual("Invalid date");
  });

  it("checkDateInvalid3", async () => {
    const qs = "?p_dateonly=2022-09-15T00:0f0:00.0Z";
    const request = await todoRouter.fetch(buildRequest({ method: "GET", path: `/todos${qs}` }));
    const resp = await request.json();

    expect(findError(resp.errors, "p_dateonly")).toEqual("Invalid date");
  });

  it("checkDateValid", async () => {
    const qs = "?p_dateonly=2022-09-15";
    const request = await todoRouter.fetch(buildRequest({ method: "GET", path: `/todos${qs}` }));
    const resp = await request.json();

    expect(findError(resp.errors, "p_dateonly")).toBeUndefined();
  });

  it("checkRegexInvalid", async () => {
    const qs = "?p_regex=123765";
    const request = await todoRouter.fetch(buildRequest({ method: "GET", path: `/todos${qs}` }));
    const resp = await request.json();

    expect(findError(resp.errors, "p_regex")).toBeTruthy();
  });

  it("checkRegexValid", async () => {
    const qs = "?p_regex=%2B919367788755";
    const request = await todoRouter.fetch(buildRequest({ method: "GET", path: `/todos${qs}` }));
    const resp = await request.json();

    expect(findError(resp.errors, "p_regex")).toBeUndefined();
  });

  it("checkEmailInvalid", async () => {
    const qs = "?p_email=asfdgsdf";
    const request = await todoRouter.fetch(buildRequest({ method: "GET", path: `/todos${qs}` }));
    const resp = await request.json();

    expect(findError(resp.errors, "p_email")).toEqual("Invalid email");
  });

  it("checkEmailInvalid2", async () => {
    const qs = "?p_email=asfdgsdf@gmail";
    const request = await todoRouter.fetch(buildRequest({ method: "GET", path: `/todos${qs}` }));
    const resp = await request.json();

    expect(findError(resp.errors, "p_email")).toEqual("Invalid email");
  });

  it("checkEmailInvalid3", async () => {
    const qs = "?p_email=@gmail.com";
    const request = await todoRouter.fetch(buildRequest({ method: "GET", path: `/todos${qs}` }));
    const resp = await request.json();

    expect(findError(resp.errors, "p_email")).toEqual("Invalid email");
  });

  it("checkEmailValid", async () => {
    const qs = "?p_email=sdfg@gmail.com";
    const request = await todoRouter.fetch(buildRequest({ method: "GET", path: `/todos${qs}` }));
    const resp = await request.json();

    expect(findError(resp.errors, "p_email")).toBeUndefined();
  });

  it("checkUuidInvalid", async () => {
    const qs = "?p_uuid=f31f890-044b-11ee-be56-0242ac120002";
    const request = await todoRouter.fetch(buildRequest({ method: "GET", path: `/todos${qs}` }));
    const resp = await request.json();

    expect(findError(resp.errors, "p_uuid")).toEqual("Invalid uuid");
  });

  it("checkUuidInvalid2", async () => {
    const qs = "?p_uuid=asdf-sdfg-dsfg-sfdg";
    const request = await todoRouter.fetch(buildRequest({ method: "GET", path: `/todos${qs}` }));
    const resp = await request.json();

    expect(findError(resp.errors, "p_uuid")).toEqual("Invalid uuid");
  });

  it("checkUuidValid", async () => {
    const qs = "?p_uuid=f31f8b90-044b-11ee-be56-0242ac120002";
    const request = await todoRouter.fetch(buildRequest({ method: "GET", path: `/todos${qs}` }));
    const resp = await request.json();

    expect(findError(resp.errors, "p_uuid")).toBeUndefined();
  });

  it("checkUuidValid2", async () => {
    const qs = "?p_uuid=f5f26194-0b07-45a4-9a85-94d3db01e7a5";
    const request = await todoRouter.fetch(buildRequest({ method: "GET", path: `/todos${qs}` }));
    const resp = await request.json();

    expect(findError(resp.errors, "p_uuid")).toBeUndefined();
  });

  it("checkHostnameInvalid", async () => {
    const qs = "?p_hostname=.com";
    const request = await todoRouter.fetch(buildRequest({ method: "GET", path: `/todos${qs}` }));
    const resp = await request.json();

    expect(findError(resp.errors, "p_hostname")).toEqual("Invalid");
  });

  it("checkHostnameValid", async () => {
    const qs = "?p_hostname=cloudflare.com";
    const request = await todoRouter.fetch(buildRequest({ method: "GET", path: `/todos${qs}` }));
    const resp = await request.json();

    expect(findError(resp.errors, "p_hostname")).toBeUndefined();
  });

  it("checkHostnameValid2", async () => {
    const qs = "?p_hostname=radar.cloudflare.com";
    const request = await todoRouter.fetch(buildRequest({ method: "GET", path: `/todos${qs}` }));
    const resp = await request.json();

    expect(findError(resp.errors, "p_hostname")).toBeUndefined();
  });

  it("checkIpv4Invalid", async () => {
    const qs = "?p_ipv4=asdfrre.wer.com";
    const request = await todoRouter.fetch(buildRequest({ method: "GET", path: `/todos${qs}` }));
    const resp = await request.json();

    expect(findError(resp.errors, "p_ipv4")).toEqual("Invalid ip");
  });

  it("checkIpv4Invalid2", async () => {
    const qs = "?p_ipv4=2001:0db8:85a3:0000:0000:8a2e:0370:7334";
    const request = await todoRouter.fetch(buildRequest({ method: "GET", path: `/todos${qs}` }));
    const resp = await request.json();

    expect(findError(resp.errors, "p_ipv4")).toEqual("Invalid ip");
  });

  it("checkIpv4Valid", async () => {
    const qs = "?p_ipv4=1.1.1.1";
    const request = await todoRouter.fetch(buildRequest({ method: "GET", path: `/todos${qs}` }));
    const resp = await request.json();

    expect(findError(resp.errors, "p_ipv4")).toBeUndefined();
  });

  it("checkIpv6Invalid", async () => {
    const qs = "?p_ipv6=asdfrre.wer.com";
    const request = await todoRouter.fetch(buildRequest({ method: "GET", path: `/todos${qs}` }));
    const resp = await request.json();

    expect(findError(resp.errors, "p_ipv6")).toEqual("Invalid ip");
  });

  it("checkIpv6Invalid2", async () => {
    const qs = "?p_ipv6=1.1.1.1";
    const request = await todoRouter.fetch(buildRequest({ method: "GET", path: `/todos${qs}` }));
    const resp = await request.json();

    expect(findError(resp.errors, "p_ipv6")).toEqual("Invalid ip");
  });

  it("checkIpv6Valid", async () => {
    const qs = "?p_ipv6=2001:0db8:85a3:0000:0000:8a2e:0370:7336";
    const request = await todoRouter.fetch(buildRequest({ method: "GET", path: `/todos${qs}` }));
    const resp = await request.json();

    expect(findError(resp.errors, "p_ipv6")).toBeUndefined();
  });

  it("checkDateArrayInvalid", async () => {
    const qs = "?p_array_dates=asadasd";
    const request = await todoRouter.fetch(buildRequest({ method: "GET", path: `/todos${qs}` }));
    const resp = await request.json();

    expect(findError(resp.errors, "p_array_dates")).toEqual("Invalid date");
  });

  it("checkDateArrayValid", async () => {
    const qs = "?p_array_dates=2023-01-01";
    const request = await todoRouter.fetch(buildRequest({ method: "GET", path: `/todos${qs}` }));
    const resp = await request.json();

    expect(findError(resp.errors, "p_array_dates")).toBeUndefined();
  });

  it("checkDateArrayValid2", async () => {
    const qs = "?p_array_dates=2023-01-01&p_array_dates=2023-01-02";
    const request = await todoRouter.fetch(buildRequest({ method: "GET", path: `/todos${qs}` }));
    const resp = await request.json();

    expect(findError(resp.errors, "p_array_dates")).toBeUndefined();
  });

  it("checkOptionalMissing", async () => {
    const qs = "?";
    const request = await todoRouter.fetch(buildRequest({ method: "GET", path: `/todos${qs}` }));
    const resp = await request.json();

    expect(findError(resp.errors, "p_optional")).toBeUndefined();
  });

  it("checkOptionalInvalid", async () => {
    const qs = "?p_optional=asfdasd";
    const request = await todoRouter.fetch(buildRequest({ method: "GET", path: `/todos${qs}` }));
    const resp = await request.json();

    expect(findError(resp.errors, "p_optional")).toEqual("Expected number, received nan");
  });

  it("checkOptionalValid", async () => {
    const qs = "?p_optional=32";
    const request = await todoRouter.fetch(buildRequest({ method: "GET", path: `/todos${qs}` }));
    const resp = await request.json();

    expect(findError(resp.errors, "p_optional")).toBeUndefined();
  });
});

describe("bodyParametersValidation", () => {
  it("requiredFieldTitle", async () => {
    const request = await todoRouter.fetch(
      buildRequest({
        method: "POST",
        path: "/todos",
        json: () => {
          return {};
        },
      }),
    );
    const resp = await request.json();

    expect(request.status).toEqual(400);

    // the current body implementation only validates 1 field at time
    expect(findError(resp.errors, "title")).toEqual("Required");
  });

  it("requiredFieldTipe", async () => {
    const request = await todoRouter.fetch(
      buildRequest({
        method: "POST",
        path: "/todos",
        json: () => {
          return {
            title: "my todo",
          };
        },
      }),
    );
    const resp = await request.json();

    expect(request.status).toEqual(400);

    // the current body implementation only validates 1 field at time
    expect(findError(resp.errors, "type")).toEqual("Required");
  });

  it("validRequest", async () => {
    const request = await todoRouter.fetch(
      buildRequest({
        method: "POST",
        path: "/todos",
        json: () => {
          return {
            title: "my todo",
            type: "nextWeek",
          };
        },
      }),
      {},
      {},
    );
    const resp = await request.json();

    expect(request.status).toEqual(200);

    expect(resp).toEqual({
      todo: { title: "my todo", type: "nextWeek" },
    });
  });

  it("validRequestWithOptionalParameters", async () => {
    const request = await todoRouter.fetch(
      buildRequest({
        method: "POST",
        path: "/todos",
        json: () => {
          return {
            title: "my todo",
            description: "this will be done",
            type: "nextWeek",
          };
        },
      }),
      {},
      {},
    );
    const resp = await request.json();

    expect(request.status).toEqual(200);

    expect(resp).toEqual({
      todo: {
        title: "my todo",
        description: "this will be done",
        type: "nextWeek",
      },
    });
  });

  it("header should be required", async () => {
    const request = await todoRouter.fetch(
      buildRequest({
        method: "get",
        path: "/header",
      }),
      {},
      {},
    );
    const resp = await request.json();

    expect(request.status).toEqual(400);

    expect(resp).toEqual({
      errors: [
        {
          code: "invalid_type",
          expected: "string",
          message: "Expected string, received null",
          path: ["headers", "p_hostname"],
          received: "null",
        },
      ],
      result: {},
      success: false,
    });
  });

  it("header should be accepted if sent", async () => {
    const request = await todoRouter.fetch(
      buildRequest({
        method: "get",
        path: "/header",
        headers: {
          p_hostname: "www.cloudflare.com",
        },
      }),
      {},
      {},
    );
    const resp = await request.json();

    expect(request.status).toEqual(200);

    expect(resp).toEqual({
      headers: {
        p_hostname: "www.cloudflare.com",
      },
    });
  });
});
