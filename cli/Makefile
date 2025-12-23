.PHONY: build install clean test lint fmt vet

BINARY_NAME=opusflow

build:
	go build -o bin/$(BINARY_NAME) main.go

install:
	go install .

clean:
	rm -f bin/$(BINARY_NAME)

test:
	go test -v ./...

test-cover:
	go test -coverprofile=coverage.out ./...
	go tool cover -html=coverage.out -o coverage.html

lint:
	golangci-lint run

fmt:
	go fmt ./...

vet:
	go vet ./...

check: fmt vet lint test
