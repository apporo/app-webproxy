Feature: HTTP request Routing

  Background:
    Given an empty mappingStore
    Then there are exactly "0" item(s) in mappingStore

  Scenario: Webrouter intercepts the URL and proxies to mapped target.
    Given a list of items in mappingStore
      | mapping_item |
      | { "source": { "url": ""} }, "target": { "hostname": "", "port": 80, "url": "" } |
    When I request url "http://example.com:7979/context/path/to/page"
    Then the response will be routed to "http://target.com/path/to/page"
    And the response "header" should equivalent to "response_header" object below
      | response_header |
      | {  } |
