.PHONY: build install clean

BINARY_NAME=opusflow

build:
	go build -o bin/$(BINARY_NAME) main.go

install:
	go install .

clean:
	rm -f bin/$(BINARY_NAME)
